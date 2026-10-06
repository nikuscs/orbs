import { runDeadline, runPendingApprovals } from './run.utils';
import type { RunServiceDeps } from '#/types/run.types';

export function runActionArm(deps: RunServiceDeps): void {
  const { db } = deps.database;
  const approvals = runPendingApprovals(deps);
  const waiting = new Set(approvals.map((approval) => approval.runId));

  const running = deps.database
    .all(db.selectFrom('run').select(['id', 'acceptedAt', 'updatedAt', 'waitedMs']).where('status', '=', 'running'))
    .filter((run) => !waiting.has(run.id));

  const routing = deps.database.all(db.selectFrom('routing').select('dueAt'));

  const reactions = deps.database.all(
    db
      .selectFrom('reaction')
      .leftJoin('message', 'message.reactionId', 'reaction.id')
      .select('reaction.deliverAt')
      .where('reaction.removedAt', 'is', null)
      .where('message.id', 'is', null),
  );

  const memories = deps.database.all(db.selectFrom('memorySnapshot').select('dueAt').where('dirty', '=', 1));
  const captures = deps.database.all(db.selectFrom('memoryRoom').select('dueAt').where('dueAt', 'is not', null));

  const earliestDeadline = Math.min(
    ...memories.map((row) => row.dueAt),
    ...captures.map((row) => row.dueAt ?? Infinity),
    ...running.map(runDeadline),
    ...approvals.map((approval) => approval.expiresAt),
    ...routing.map((row) => row.dueAt),
    ...reactions.map((row) => row.deliverAt),
  );

  if (Number.isFinite(earliestDeadline)) {
    deps.alarm.set(earliestDeadline);
  }
}
