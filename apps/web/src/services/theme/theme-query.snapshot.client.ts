import type { ThemeResolved, ThemeState } from '@/types/theme.types';

export function themeQuerySnapshot(state: ThemeState): ThemeResolved {
  if (state.choice === undefined) {
    try {
      const stored = localStorage.getItem('orbs.theme');
      state.choice = stored === 'dark' || stored === 'system' ? stored : 'light';
    } catch {
      state.choice = 'light';
    }
  }

  if (state.choice !== 'system') {
    return state.choice;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
