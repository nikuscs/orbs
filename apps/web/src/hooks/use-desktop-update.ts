import { useSyncExternalStore } from 'react';
import { DESKTOP } from '@/services/desktop/desktop.constants';

function desktopUpdateSubscribe(onChange: () => void) {
  window.addEventListener(DESKTOP.updateEvent, onChange);

  return () => window.removeEventListener(DESKTOP.updateEvent, onChange);
}

export function useDesktopUpdate() {
  return useSyncExternalStore(desktopUpdateSubscribe, () => window.__botsUpdate ?? null, () => null);
}
