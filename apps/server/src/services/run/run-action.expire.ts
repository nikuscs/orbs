import { runActionAnnounce } from './run-action.announce';
import { runActionArm } from './run-action.arm';
import { runActionDisconnect } from './run-action.disconnect';
import { runActionDispatch } from './run-action.dispatch';
import { runActionRoute } from './run-action.route';
import { runApprovalAnswer, runDeadline, runPendingApprovals } from './run.utils';
import type { RunServiceDeps } from '#/types/run.types';

export async function runActionExpire(deps: RunServiceDeps): Promise<void> {
  const now = Date.now();
  const approvals = runPendingApprovals(deps);

  for (const approval of approvals.filter((item) => item.expiresAt <= now)) {
    runApprovalAnswer(deps, approval, 'expired', null);
  }

  const waiting = new Set(approvals.filter((item) => item.expiresAt > now).map((item) => item.runId));

  const unrouted = deps.database.all(deps.database.db
    .selectFrom('routing')
    .select('messageId')
    .where('dueAt', '<=', now));

  const running = deps.database.all(deps.database.db
    .selectFrom('run')
    .select(['id', 'roomId', 'acceptedAt', 'updatedAt', 'waitedMs'])
    .where('status', '=', 'running'));

  const due = running.filter((run) => !waiting.has(run.id) && runDeadline(run) <= now);

  const unacceptedDue = due.some((run) => !run.acceptedAt);

  if (unacceptedDue) {
    deps.sockets.daemon()?.close();
    runActionDisconnect(deps);
  } else if (due.length > 0) {
    const daemon = deps.sockets.daemon();

    for (const run of due) {
      daemon?.send({ type: 'run.interrupt', runId: run.id });
    }

    deps.database.run(deps.database.db
      .updateTable('run')
      .set({ status: 'interrupted', updatedAt: new Date(now).toISOString() })
      .where('id', 'in', due.map((run) => run.id)));

    for (const roomId of new Set(due.map((run) => run.roomId))) {
      runActionAnnounce(deps, { roomId });
    }

    runActionDispatch(deps);
  }

  const routing = unrouted.map((row) => runActionRoute(deps, { messageId: row.messageId }));

  runActionArm(deps);
  await Promise.all(routing);
}
