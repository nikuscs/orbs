import { themeActionApply } from './theme-action.apply.client';
import type { ThemeState, ThemeSubscriber } from '@/types/theme.types';

export function themeActionSubscribe(state: ThemeState, listener: ThemeSubscriber) {
  state.listeners.add(listener);
  themeActionApply(state);

  if (!state.cleanup) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const themeApply = () => themeActionApply(state);

    const themeSyncStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'orbs.theme') {
        return;
      }

      state.choice = undefined;
      themeApply();
    };

    window.addEventListener('storage', themeSyncStorage);
    media.addEventListener('change', themeApply);
    state.cleanup = () => {
      window.removeEventListener('storage', themeSyncStorage);
      media.removeEventListener('change', themeApply);
    };
  }

  return () => {
    state.listeners.delete(listener);

    if (state.listeners.size === 0) {
      state.cleanup?.();
      state.cleanup = undefined;
    }
  };
}
