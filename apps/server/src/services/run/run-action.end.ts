import { isToolUIPart, safeValidateUIMessages } from 'ai';
import { roomMessageCompaction, roomMessageRoute } from '#/types/room.types';
import { roomLastSeq, roomMessagePart, roomPreview } from '#services/room/room.utils';
import { runActionAnnounce } from './run-action.announce';
import { runActionArm } from './run-action.arm';
import { runActionDispatch } from './run-action.dispatch';
import { runActionRoute } from './run-action.route';
import { runQueryGet } from './run-query.get';
import { RUN } from './run.constants';
import { runPassText } from './run.utils';
import type { DaemonRunFailure } from '#/types/daemon.types';
import type { DatabaseTenantMessage, DatabaseTenantRun } from '#/types/database-tenant.types';
import type { RunActionEndParams, RunArrivedMessage, RunServiceDeps } from '#/types/run.types';

export async function runActionEnd(deps: RunServiceDeps, params: RunActionEndParams): Promise<void> {
  function runSteeredTo(message: RunArrivedMessage, run: DatabaseTenantRun): boolean {
    const route = roomMessageRoute.safeParse(JSON.parse(message.route ?? 'null'));

    return route.success && route.data.via === 'steer' && route.data.picks.some((pick) => pick.botId === run.botId);
  }

  function runArrived(serviceDeps: RunServiceDeps, run: DatabaseTenantRun): RunArrivedMessage[] {
    return serviceDeps.database.all(
      serviceDeps.database.db
        .selectFrom('message')
        .select(['id', 'roomId', 'seq', 'authorId', 'authorName', 'parts', 'route'])
        .where('roomId', '=', run.roomId)
        .where('role', '=', 'user')
        .where('seq', '>', run.contextThrough ?? 0)
        .orderBy('seq'),
    );
  }

  function runSeqThroughDeliveredSteers(arrived: RunArrivedMessage[], run: DatabaseTenantRun, steered: string[]): number | undefined {
    const firstUnread = arrived.findIndex((message) => !(steered.includes(message.id) && runSteeredTo(message, run)));

    return (firstUnread === -1 ? arrived : arrived.slice(0, firstUnread)).at(-1)?.seq;
  }

  const run = runQueryGet(deps, params);

  if (run?.status !== 'running') {
    return;
  }

  const hasParts = params.parts.length > 0;

  const validated = hasParts
    ? await safeValidateUIMessages({
      messages: [{ id: crypto.randomUUID(), role: 'assistant', parts: params.parts }],
      dataSchemas: { compaction: roomMessageCompaction },
    })
    : undefined;

  if (runQueryGet(deps, params)?.status !== 'running') {
    return;
  }

  const runHasRoomContent = (parts: typeof params.parts) =>
    parts.some((part) => (part.type === 'text' && part.text.trim() !== '') || isToolUIPart(part));

  const reply = validated?.success ? validated.data.at(0) : undefined;

  const invalidReply = validated?.success === false ? validated.error : undefined;
  const status = invalidReply ? 'failed' : params.status;
  const failure: DaemonRunFailure | null = invalidReply ? { code: 'turn_error', detail: invalidReply.message } : params.failure;

  const spoken = reply && { ...reply, parts: reply.parts.filter((part) => part.type !== 'text' || runPassText(part.text) !== RUN.pass) };
  const message = spoken && runHasRoomContent(spoken.parts) ? spoken : undefined;
  const updatedAt = new Date().toISOString();
  const { resume } = params;
  const { db } = deps.database;
  const arrived = runArrived(deps, run);

  const undeliveredSteers =
    status === 'completed' ? arrived.filter((item) => runSteeredTo(item, run) && !params.steeredMessageIds.includes(item.id)) : [];

  const stored = deps.database.transaction(() => {
    const row: DatabaseTenantMessage | undefined = message && {
      id: message.id,
      seq: roomLastSeq(deps.database, run.roomId) + 1,
      roomId: run.roomId,
      role: 'assistant',
      authorId: run.botId,
      authorName: run.botName,
      runId: run.id,
      parts: JSON.stringify(message.parts.map(roomMessagePart)),
      route: null,
      usage: params.usage ? JSON.stringify(params.usage) : null,
      replyTo: null,
      rerunOf: null,
      triggerId: run.triggerMessageId,
      reactionId: null,
      createdAt: updatedAt,
    };

    if (row) {
      deps.database.run(db.insertInto('message').values(row));
    }

    deps.database.run(db.updateTable('run').set({
      status,
      failure: failure && JSON.stringify(failure),
      updatedAt,
    }).where('id', '=', run.id));

    if (resume) {
      const completedReadThrough =
        status === 'completed'
          ? { contextThrough: runSeqThroughDeliveredSteers(arrived, run, params.steeredMessageIds) ?? run.contextThrough ?? 0 }
          : {};

      deps.database.run(
        db
          .insertInto('binding')
          .values({
            roomId: run.roomId,
            botId: run.botId,
            harnessId: run.harnessId,
            resume,
            contextThrough: 0,
            ...completedReadThrough,
            updatedAt,
          })
          .onConflict((conflict) =>
            conflict.columns(['roomId', 'botId', 'harnessId']).doUpdateSet({
              resume,
              ...completedReadThrough,
              updatedAt,
            }),
          ),
      );
    }

    return row;
  });

  if (stored) {
    deps.sockets.broadcast({
      type: 'message.created',
      roomId: run.roomId,
      message: {
        ...stored,
        parts: JSON.stringify(message?.parts.filter((part) => part.type === 'text' || isToolUIPart(part)).map(roomMessagePart) ?? []),
      },
      preview: roomPreview(stored),
    });
  }

  runActionAnnounce(deps, { roomId: run.roomId });
  runActionArm(deps);

  const toRoute = [...undeliveredSteers, ...(message && status === 'completed' ? [message] : [])];

  if (toRoute.length === 0) {
    runActionDispatch(deps);
    return;
  }

  await Promise.all(toRoute.map((item) => runActionRoute(deps, { messageId: item.id })));
}
