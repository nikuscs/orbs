import type { AuthActionDeleteApiKeyParams, AuthInstanceDeps } from '#/types/auth.types';

export async function authActionDeleteApiKey(deps: AuthInstanceDeps, params: AuthActionDeleteApiKeyParams): Promise<void> {
  await deps.auth.api.deleteApiKey({ headers: params.headers, body: { keyId: params.keyId } });
  await deps.disconnect({ organizationId: params.organizationId, owner: { kind: 'key', id: params.keyId } });
}
