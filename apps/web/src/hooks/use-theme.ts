import { Errors } from '@orbs/errors/universal';
import { useContext } from 'react';
import { themeContext } from '@/context/theme';

export function useTheme() {
  const context = useContext(themeContext);

  if (context === null) {
    throw new Errors.INTERNAL_ERROR({ internal: 'useTheme must be used within ContextTheme' });
  }

  return context;
}
