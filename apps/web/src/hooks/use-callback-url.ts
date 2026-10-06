import { resolveIntendedUrl } from '@orbs/tanstack-helpers/universal';
import { useSearch } from '@tanstack/react-router';

const DEFAULT_CALLBACK = '/rooms';

export function useCallbackUrl() {
  const search = useSearch({ from: '/auth' });
  return resolveIntendedUrl({ intended: search.redirectTo ?? null, fallback: DEFAULT_CALLBACK });
}
