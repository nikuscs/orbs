import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeQueryComputerEndpoint(deps: RuntimeServiceDeps) {
  return runtimeComputer(deps).queries.endpoint();
}
