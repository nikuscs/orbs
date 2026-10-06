import { themeActionApply } from './theme-action.apply.client';
import { themeActionSubscribe } from './theme-action.subscribe.client';
import { themeQuerySnapshot } from './theme-query.snapshot.client';
import type { ThemeResolved, ThemeState, ThemeSubscriber } from '@/types/theme.types';

export function themeCreateService() {
  const state: ThemeState = { choice: undefined, listeners: new Set() };

  return {
    subscribe: (listener: ThemeSubscriber) => themeActionSubscribe(state, listener),
    getSnapshot: () => themeQuerySnapshot(state),
    getServerSnapshot: (): ThemeResolved => 'light',
    toggle: () => {
      state.choice = themeQuerySnapshot(state) === 'dark' ? 'light' : 'dark';
      themeActionApply(state);

      try {
        localStorage.setItem('orbs.theme', state.choice);
      } catch {
        return false;
      }

      return true;
    },
  };
}
