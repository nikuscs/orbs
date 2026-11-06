import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeComputerViewerParams, RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeActionCreateComputerViewer(deps: RuntimeServiceDeps, { context, mode, principal }: RuntimeComputerViewerParams) {
  return runtimeComputer(deps).actions.viewer({ mode, principal }, context);
}
