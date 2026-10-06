import { AUTH } from './auth.constants';
import type { AuthActionBanUserParams, AuthInstanceDeps } from '#/types/auth.types';

export async function authActionBanUser(deps: AuthInstanceDeps, params: AuthActionBanUserParams): Promise<void> {
  await deps.auth.api.banUser({
    headers: params.headers,
    body: {
      userId: params.userId,
      banReason: params.reason,
      banExpiresIn: params.expiresInDays ? params.expiresInDays * AUTH.daySeconds : undefined,
    },
  });
}
