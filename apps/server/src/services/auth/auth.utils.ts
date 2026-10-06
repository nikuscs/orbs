import type { AuthBan, AuthBanState } from '#/types/auth.types';

export function authBan(state: AuthBanState): AuthBan | null {
  if (!state.banned) {
    return null;
  }

  const until = state.banExpires ? new Date(state.banExpires) : null;

  if (until && until.getTime() <= Date.now()) {
    return null;
  }

  return { until: until?.toISOString() ?? null };
}
