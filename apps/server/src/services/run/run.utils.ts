import { daemonRunFailure } from '#/types/daemon.types';
import { runToolOutput } from '#/types/run.types';
import { roomClipToolText, roomFileId, roomFilePath, roomMessageFiles, roomMessageMentions } from '#services/room/room.utils';
import { ROUTE } from '#services/route/route.constants';
import { RUN } from './run.constants';
import { runPromptsApprovalReason } from './run.prompts';
import type { DaemonStartFile } from '#/types/daemon.types';
import type { DatabaseTenantApproval, DatabaseTenantMessage, DatabaseTenantRun } from '#/types/database-tenant.types';
import type * as RunTypes from '#/types/run.types';
import type { UIMessageChunk } from 'ai';

export function runContextWindow<T extends Pick<DatabaseTenantMessage, 'authorId'>>(messages: T[]): T[] {
  const kept = new Map<string, number>();

  return messages.filter((message) => {
    const count = (kept.get(message.authorId) ?? 0) + 1;

    kept.set(message.authorId, count);

    return count <= ROUTE.contextMessagesPerBot;
  });
}

export function runSkills(messages: Pick<DatabaseTenantMessage, 'role' | 'parts'>[]): string[] {
  const humanMessages = messages.filter((message) => message.role === 'user');

  const names = humanMessages
    .flatMap((message) => roomMessageMentions(message.parts))
    .flatMap((target) => (target.kind === 'skill' ? [target.id] : []));

  return [...new Set(names)];
}

export function runFiles(messages: Pick<DatabaseTenantMessage, 'role' | 'parts'>[], roomId: string, sizes: Map<string, number>): DaemonStartFile[] {
  const files = messages
    .filter((message) => message.role === 'user')
    .flatMap((message) => roomMessageFiles(message.parts))
    .reverse()
    .map((file) => {
      const id = roomFileId(file.url);

      return { id, name: file.filename, mediaType: file.mediaType, size: sizes.get(id) ?? 0, path: roomFilePath(roomId, id, file.filename) };
    });

  return [...new Map(files.map((file) => [file.id, file])).values()];
}

export function runPassText(text: string): string {
  return text.replaceAll(/^[\s"'*`]+|[\s"'*`.!]+$/g, '');
}

export function runClipChunk(chunk: UIMessageChunk): UIMessageChunk {
  if (chunk.type === 'tool-output-available') {
    const output = runToolOutput.safeParse(chunk.output);

    return output.success ? { ...chunk, output: roomClipToolText(output.data) } : chunk;
  }

  if (chunk.type === 'tool-output-error') {
    return { ...chunk, errorText: roomClipToolText(chunk.errorText) };
  }

  return chunk;
}

export function runDeadline(run: Pick<DatabaseTenantRun, 'acceptedAt' | 'updatedAt' | 'waitedMs'>): number {
  return run.acceptedAt ? Date.parse(run.acceptedAt) + RUN.turnTimeoutMs + run.waitedMs : Date.parse(run.updatedAt) + RUN.acceptTimeoutMs;
}

export function runChunkSave(deps: Pick<RunTypes.RunServiceDeps, 'database' | 'sockets'>, run: Pick<DatabaseTenantRun, 'id' | 'roomId'>, chunk: UIMessageChunk): void {
  const stored = deps.database.all(deps.database.db
    .insertInto('chunk')
    .values({ runId: run.id, body: JSON.stringify(chunk) })
    .returning('id')).at(0);

  deps.sockets.broadcast({
    type: 'run.chunk',
    roomId: run.roomId,
    runId: run.id,
    chunkId: stored?.id ?? 0,
    chunk,
  });
}

export function runPendingApprovals(deps: Pick<RunTypes.RunServiceDeps, 'database'>): Pick<DatabaseTenantApproval, 'id' | 'runId' | 'expiresAt' | 'createdAt'>[] {
  return deps.database.all(deps.database.db
    .selectFrom('approval')
    .innerJoin('run', 'run.id', 'approval.runId')
    .select(['approval.id', 'approval.runId', 'approval.expiresAt', 'approval.createdAt'])
    .where('approval.status', '=', 'pending')
    .where('run.status', '=', 'running'));
}

export function runApprovalAnswer(
  deps: Pick<RunTypes.RunServiceDeps, 'database' | 'sockets'>,
  approval: Pick<DatabaseTenantApproval, 'id' | 'runId' | 'createdAt'>,
  answer: RunTypes.RunApprovalAnswer,
  answeredBy: string | null,
): void {
  const now = Date.now();
  const updatedAt = new Date(now).toISOString();
  const { db } = deps.database;

  deps.database.transaction(() => {
    deps.database.run(db
      .updateTable('approval')
      .set({
        status: answer,
        answeredBy,
        updatedAt,
      })
      .where('id', '=', approval.id));
    const waitMs = now - Date.parse(approval.createdAt);

    deps.database.run(db
      .updateTable('run')
      .set((eb) => ({ waitedMs: eb('waitedMs', '+', waitMs) }))
      .where('id', '=', approval.runId));
  });
  deps.sockets.daemon()?.send({
    type: 'run.approval.answer',
    runId: approval.runId,
    approvalId: approval.id,
    approved: answer === 'allowed',
    reason: runPromptsApprovalReason(answer, answeredBy),
  });
}

export function runLatestHumanSeq(deps: Pick<RunTypes.RunServiceDeps, 'database'>, roomId: string): number {
  return deps.database.all(deps.database.db
    .selectFrom('message')
    .select((eb) => eb.fn.coalesce(eb.fn.max('seq'), eb.lit(0)).as('seq'))
    .where('roomId', '=', roomId)
    .where('role', '=', 'user')
    .where('reactionId', 'is', null)).at(0)?.seq ?? 0;
}

export function runRoom(row: RunTypes.RunRoomRow): RunTypes.RunRoom {
  const failure = daemonRunFailure.safeParse(JSON.parse(row.failure ?? 'null'));

  return { ...row, failure: failure.success ? failure.data : null };
}
