import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeContextInput, RuntimeServiceDeps } from '../../types/runtime.types';
import type { BotGetInput } from '@repo/contracts/universal';

export function runtimeActionShutdownComputer(deps: RuntimeServiceDeps, { context }: BotGetInput & RuntimeContextInput) {
  return runtimeComputer(deps).actions.shutdown(context);
}
