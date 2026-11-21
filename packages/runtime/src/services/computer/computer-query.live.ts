import { computerDocument } from './computer.constants';
import { computerTaskNode } from './computer.utils';
import type { ComputerContextParams, ComputerServiceDeps } from '../../types/computer.types';

export async function computerQueryLive({ harness }: ComputerServiceDeps, { context }: ComputerContextParams): Promise<boolean> {
  const record = await harness.snapshot(computerDocument, context);
  const graph = await harness.taskGraph(context);

  try {
    return computerTaskNode(graph.value.tasks, record?.taskId) !== null;
  } finally {
    graph.dispose();
  }
}
