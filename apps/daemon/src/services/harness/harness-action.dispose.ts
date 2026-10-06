import type { HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionDispose(deps: HarnessServiceDeps): void {
  for (const adapter of deps.adapters.values()) {
    adapter.dispose();
  }
}
