import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeComputerControlParams, RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeActionTakeComputerControl(deps: RuntimeServiceDeps, { context, deviceId, deviceName, until }: RuntimeComputerControlParams) {
  return runtimeComputer(deps).actions.takeControl({
    deviceId,
    deviceName,
    until,
  }, context);
}
