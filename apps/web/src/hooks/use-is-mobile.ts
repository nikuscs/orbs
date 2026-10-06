import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export function useIsMobile() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(MOBILE_QUERY);
      mediaQuery.addEventListener('change', onStoreChange);

      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
