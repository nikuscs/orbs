import type { SkewState } from '@/types/skew.types';
import type { AnyRouter } from '@tanstack/react-router';

export function skewActionInstall(state: SkewState, router: AnyRouter) {
  if (state.installed) {
    return;
  }

  state.installed = true;

  function skewReloadOnce() {
    const lastReload = Number(sessionStorage.getItem('orbs.skewReload'));

    if (Date.now() - lastReload < 10_000) {
      return;
    }

    sessionStorage.setItem('orbs.skewReload', String(Date.now()));
    window.location.reload();
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    skewReloadOnce();
  });

  router.subscribe('onBeforeNavigate', () => {
    if (state.stale) {
      skewReloadOnce();
    }
  });
}
