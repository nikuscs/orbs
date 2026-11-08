import type { ComputerReleaseParams, ComputerServiceDeps } from '../../types/computer.types';

export async function computerActionRelease({ bots, runtime }: ComputerServiceDeps, params: ComputerReleaseParams) {
  await bots.queries.get({ botId: params.botId });
  await runtime.actions.computerReleaseControl(params);

  return runtime.queries.computerStatus(params);
}
