export type ThemeResolved = 'light' | 'dark';

export type ThemeChoice = ThemeResolved | 'system';

export interface ThemeContextValue {
  resolved: ThemeResolved
  toggle: () => void
}

export type ThemeSubscriber = () => void;

export interface ThemeState {
  choice: ThemeChoice | undefined;
  listeners: Set<ThemeSubscriber>;
  cleanup?: ThemeSubscriber;
}
