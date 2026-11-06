import { runtimeComputer } from './runtime-computer.utils';
import type { RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeActionThumbnailComputer(deps: RuntimeServiceDeps) {
  return runtimeComputer(deps).actions.thumbnail();
}
