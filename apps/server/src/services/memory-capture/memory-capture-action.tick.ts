import { memoryExtractionSources } from '#/types/memory-extraction.types';
import { MEMORY } from '#services/memory/memory.constants';
import { roomMessageText } from '#services/room/room.utils';
import { routeRedact } from '#services/route/route.utils';
import { memoryCaptureActionApply } from './memory-capture-action.apply';
import { memoryCaptureActionFail } from './memory-capture-action.fail';
import type { DaemonMemoryRequest } from '#/types/daemon.types';
import type { MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export async function memoryCaptureActionTick(deps: MemoryCaptureServiceDeps): Promise<DaemonMemoryRequest | undefined> {
  const { db } = deps.database;

  const timedOut = deps.database.all(
    db.selectFrom('memoryRoom').selectAll().where('status', '=', 'running').where('dueAt', '<=', Date.now()),
  );

  for (const job of timedOut) {
    memoryCaptureActionFail(deps, { roomId: job.roomId, error: 'timeout' });
  }

  const active = deps.database.all(db.selectFrom('memoryRoom').select('dueAt').where('status', '=', 'running')).at(0);

  if (active) {
    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({ dueAt: active.dueAt ?? Date.now() + MEMORY.debounceMs })
        .where('status', 'in', ['pending', 'applying'])
        .where('dueAt', '<=', Date.now()),
    );
    return;
  }

  const row = deps.database
    .all(
      db
        .selectFrom('memoryRoom')
        .selectAll()
        .where('enabled', '=', 1)
        .where('status', 'in', ['pending', 'applying'])
        .where('dueAt', '<=', Date.now())
        .orderBy('dueAt')
        .limit(1),
    )
    .at(0);

  if (!row) {
    return;
  }

  if (row.result) {
    await memoryCaptureActionApply(deps, { roomId: row.roomId });
    return;
  }

  deps.database.run(
    db
      .updateTable('memoryRoom')
      .set({ dueAt: Date.now() + MEMORY.debounceMs })
      .where('roomId', '=', row.roomId),
  );
  const daemon = deps.sockets.daemon();
  const runs = deps.database.all(db.selectFrom('run').select(['roomId', 'status']).where('status', 'in', ['queued', 'running']));
  const routing = deps.database.all(db.selectFrom('routing').select('messageId').limit(1));

  const reactions = deps.database.all(
    db
      .selectFrom('reaction')
      .leftJoin('message', 'message.reactionId', 'reaction.id')
      .select('reaction.id')
      .where('reaction.roomId', '=', row.roomId)
      .where('reaction.removedAt', 'is', null)
      .where('message.id', 'is', null)
      .limit(1),
  );

  if (
    !daemon ||
    runs.some((run) => run.roomId === row.roomId || run.status === 'queued') ||
    runs.length >= daemon.maxTurns ||
    routing.length ||
    reactions.length
  ) {
    return;
  }

  const model = (await deps.organization.queries.settings({ organizationId: deps.organizationId })).memory.model;

  if (model?.harnessId !== 'pi' || !daemon.harnessIds.includes(model.harnessId)) {
    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({
          status: 'paused',
          dueAt: null,
          error: 'model_unavailable',
        })
        .where('roomId', '=', row.roomId),
    );
    return;
  }

  const available = row.source
    ? memoryExtractionSources.parse(JSON.parse(row.source))
    : deps.database
      .all(
        db
          .selectFrom('message')
          .select(['id', 'seq', 'role', 'authorId', 'authorName', 'parts'])
          .where('roomId', '=', row.roomId)
          .where('seq', '>', row.cursor)
          .where('reactionId', 'is', null)
          .orderBy('seq')
          .limit(MEMORY.batchMessages),
      )
      .map(({ parts, ...message }) => ({ ...message, endOffset: null, text: routeRedact(roomMessageText(parts)) }));

  const raw = [];
  let size = 2;

  for (const source of available) {
    const offset = source.seq === row.cursor + 1 ? row.offset : 0;
    const text = source.text.slice(offset, offset + 3000);

    const segment = row.source
      ? source
      : { ...source, text, endOffset: offset + text.length < source.text.length ? offset + text.length : null };

    const length = JSON.stringify(segment).length + 1;

    if (size + length > MEMORY.batchChars) {
      break;
    }

    raw.push(segment);
    size += length;

    if (segment.endOffset !== null) {
      break;
    }
  }

  const blocked = new Set(
    await deps.memory.queries.suppressed({ organizationId: deps.organizationId, sourceIds: raw.map((source) => source.id) }),
  );

  const sources = raw.filter((source) => !blocked.has(source.id));
  const throughSeq = raw.at(-1)?.seq ?? row.cursor;

  if (!sources.length) {
    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({
          status: raw.length ? 'pending' : 'idle',
          cursor: raw.at(-1)?.endOffset ? throughSeq - 1 : throughSeq,
          offset: raw.at(-1)?.endOffset ?? 0,
          throughSeq,
          source: null,
          dueAt: raw.length ? Date.now() + MEMORY.debounceMs : null,
        })
        .where('roomId', '=', row.roomId),
    );
    return;
  }

  const existing = await deps.memory.queries.candidates({
    organizationId: deps.organizationId,
    roomId: row.roomId,
    subjectIds: sources.filter((source) => source.role === 'user').map((source) => source.authorId),
  });

  const requestId = crypto.randomUUID();
  deps.database.run(
    db
      .updateTable('memoryRoom')
      .set({
        status: 'running',
        baseRecapRevision: row.recapRevision,
        requestId,
        model: JSON.stringify(model),
        source: JSON.stringify(raw),
        fromSeq: raw[0]?.seq ?? row.cursor,
        throughSeq,
        dueAt: Date.now() + MEMORY.timeoutMs,
        error: null,
      })
      .where('roomId', '=', row.roomId),
  );
  deps.sockets.broadcast({ type: 'memory.updated' });

  return {
    type: 'memory.extract',
    requestId,
    generation: row.generation,
    roomId: row.roomId,
    ...model,
    instructions: deps.instructions(),
    prompt: JSON.stringify({
      roomId: row.roomId,
      context: deps.database.all(db.selectFrom('message').select(['role', 'authorId', 'parts']).where('roomId', '=', row.roomId).where('seq', '<=', row.cursor).where('reactionId', 'is', null).orderBy('seq', 'desc').limit(6)).reverse().map(({ parts, ...message }) => ({ ...message, text: routeRedact(roomMessageText(parts)).slice(0, 1500) })),
      sources,
      existing,
      previousRecap: row.recap,
      recapSources: sources.filter((source) => source.seq >= row.recapFrom),
    }),
  };
}
