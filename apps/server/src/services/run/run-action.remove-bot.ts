import { runActionAnnounce } from './run-action.announce';
import type { RunActionRemoveBotParams, RunServiceDeps } from '#/types/run.types';

export function runActionRemoveBot(deps: RunServiceDeps, params: RunActionRemoveBotParams): void {
  const { db } = deps.database;

  const runs = deps.database.all(db
    .selectFrom('run')
    .select(['id', 'roomId', 'status', 'triggerMessageId'])
    .where('botId', '=', params.botId)
    .where('status', 'in', ['queued', 'running']));

  const daemon = deps.sockets.daemon();

  for (const run of runs.filter((item) => item.status === 'running')) {
    daemon?.send({ type: 'run.interrupt', runId: run.id });
  }

  deps.database.transaction(() => {
    deps.database.run(db
      .updateTable('run')
      .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .where('botId', '=', params.botId)
      .where('status', 'in', ['queued', 'running']));

    const triggers = runs.flatMap((run) => run.triggerMessageId ? [run.triggerMessageId] : []);

    if (triggers.length > 0) {
      deps.database.run(db
        .insertInto('routing')
        .columns(['messageId', 'dueAt'])
        .expression(db
          .selectFrom('message')
          .select(['id', (eb) => eb.val(Date.now()).as('dueAt')])
          .where('id', 'in', triggers)
          .where('role', '=', 'user')
          .where('reactionId', 'is', null))
        .onConflict((conflict) => conflict.doNothing()));
    }
  });

  for (const roomId of new Set(runs.map((run) => run.roomId))) {
    runActionAnnounce(deps, { roomId });
  }
}
