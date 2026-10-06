import { ScriptOnce } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';
import { themeContext } from '@/context/theme';
import { themeCreateService } from '@/services/theme/theme.client';
import type { PropsWithChildren } from 'react';

const themeStorageKey = 'orbs.theme';

const themeScript = `
(() => {
  let theme = "light";
  try { theme = localStorage.getItem("${themeStorageKey}") || "light"; } catch {}
  const resolved = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  document.documentElement.style.colorScheme = resolved;
})();
`;

export function ContextThemeScript() {
  return <ScriptOnce>{themeScript}</ScriptOnce>;
}

const themeService = themeCreateService();

export function ContextTheme({ children }: PropsWithChildren) {
  const resolved = useSyncExternalStore(themeService.subscribe, themeService.getSnapshot, themeService.getServerSnapshot);

  return <themeContext.Provider value={{ resolved, toggle: themeService.toggle }}>{children}</themeContext.Provider>;
}
