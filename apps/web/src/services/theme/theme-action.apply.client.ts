import { themeQuerySnapshot } from './theme-query.snapshot.client';
import type { ThemeState } from '@/types/theme.types';

export function themeActionApply(state: ThemeState) {
  const resolved = themeQuerySnapshot(state);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
  document.documentElement.style.colorScheme = resolved;

  for (const listener of state.listeners) {
    listener();
  }
}
