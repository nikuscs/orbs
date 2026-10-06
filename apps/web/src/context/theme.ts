import { createContext } from 'react';
import type { ThemeContextValue } from '@/types/theme.types';

export const themeContext = createContext<ThemeContextValue | null>(null);
