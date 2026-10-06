import type { AuthActionUnbanUserParams, AuthInstanceDeps } from '#/types/auth.types';

export async function authActionUnbanUser(deps: AuthInstanceDeps, params: AuthActionUnbanUserParams): Promise<void> {
  await deps.auth.api.unbanUser({ headers: params.headers, body: { userId: params.userId } });
}
