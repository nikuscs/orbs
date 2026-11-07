import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeContextInput, RuntimeServiceDeps } from '../../types/runtime.types';
import type { BotGetInput } from '@repo/contracts/universal';

export function runtimeActionReleaseComputerControl(deps: RuntimeServiceDeps, { context }: BotGetInput & RuntimeContextInput) {
  return runtimeComputer(deps).actions.releaseControl(context);
}
