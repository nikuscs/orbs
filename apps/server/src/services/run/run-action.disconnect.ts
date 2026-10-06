import { runActionAnnounce } from './run-action.announce';
import type { RunServiceDeps } from '#/types/run.types';

export function runActionDisconnect(deps: RunServiceDeps): void {
  function runKeepOldestQueuedPerBot(serviceDeps: RunServiceDeps, roomIds: string[], updatedAt: string): void {
    const { db } = serviceDeps.database;

    const queued = serviceDeps.database.all(db
      .selectFrom('run')
      .select(['id', 'roomId', 'botId', 'hop', 'seat'])
      .where('status', '=', 'queued')
      .where('roomId', 'in', roomIds)
      .orderBy('createdAt'));

    const groups = new Map<string, typeof queued>();

    for (const run of queued) {
      const key = `${run.roomId}:${run.botId}`;
      groups.set(key, [...groups.get(key) ?? [], run]);
    }

    for (const [first, ...rest] of groups.values()) {
      if (rest.length === 0) {
        continue;
      }

      serviceDeps.database.run(db
        .updateTable('run')
        .set({
          hop: Math.min(first.hop, ...rest.map((run) => run.hop)),
          seat: [first, ...rest].some((run) => run.seat === 'required') ? 'required' : first.seat,
          updatedAt,
        })
        .where('id', '=', first.id));
      serviceDeps.database.run(db
        .updateTable('run')
        .set({ status: 'cancelled', updatedAt })
        .where('id', 'in', rest.map((run) => run.id)));
    }
  }

  const { db } = deps.database;
  const updatedAt = new Date().toISOString();

  const rows = deps.database.transaction(() => {
    const requeued = deps.database.all(db
      .updateTable('run')
      .set({
        status: 'queued',
        contextThrough: null,
        updatedAt,
      })
      .where('status', '=', 'running')
      .where('acceptedAt', 'is', null)
      .returning('roomId'));

    const interrupted = deps.database.all(db
      .updateTable('run')
      .set({ status: 'interrupted', updatedAt })
      .where('status', '=', 'running')
      .returning('roomId'));

    return [...requeued, ...interrupted];
  });

  const roomIds = [...new Set(rows.map((row) => row.roomId))];

  if (roomIds.length > 0) {
    runKeepOldestQueuedPerBot(deps, roomIds, updatedAt);
  }

  for (const roomId of roomIds) {
    runActionAnnounce(deps, { roomId });
  }
}
