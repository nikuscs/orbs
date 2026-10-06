import { runActionInterrupt } from './run-action.interrupt';
import type { RunServiceDeps } from '#/types/run.types';

export async function runActionAbort(deps: RunServiceDeps): Promise<void> {
  deps.mcpInternal.actions.close();
  await Promise.all([...deps.turns.keys()].map((runId) => runActionInterrupt(deps, { type: 'run.interrupt', runId })));
}
