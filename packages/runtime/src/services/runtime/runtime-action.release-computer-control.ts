import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeComputerReleaseParams, RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeActionReleaseComputerControl(deps: RuntimeServiceDeps, { context, deviceId }: RuntimeComputerReleaseParams) {
  return runtimeComputer(deps).actions.releaseControl({ deviceId }, context);
}
