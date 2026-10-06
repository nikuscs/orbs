import { skewActionInstall } from './skew-action.install.client';
import type { SkewState } from '@/types/skew.types';
import type { AnyRouter } from '@tanstack/react-router';

export function skewActionCreate() {
  const state: SkewState = { stale: false, installed: false };

  return {
    markStale: (version: string | null) => {
      if (version && version !== import.meta.env.VITE_APP_VERSION) {
        state.stale = true;
      }
    },
    installListeners: (router: AnyRouter) => skewActionInstall(state, router),
  };
}
