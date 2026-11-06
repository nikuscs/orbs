import { ROUTINE } from './routine.constants';
import type { RoutineServiceDeps } from '../../types/routine.types';
import type { Context } from '@earendil-works/chord/context';

export async function routineActionRecover({ harness }: RoutineServiceDeps, context: Context) {
  const graph = await harness.taskGraph(context);

  try {
    const parked = Object.values(graph.value.tasks)
      .filter((task) => task.kind === ROUTINE.task && task.blocked === 'restart_limit' && !task.abortRequested);

    await Promise.all(parked.map((task) => harness.retryTask(task.id, context)));
  } finally {
    graph.dispose();
  }
}
