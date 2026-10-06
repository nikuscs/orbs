import type { AuthApiKeyVerified, AuthInstanceDeps, AuthQueryApiKeyParams } from '#/types/auth.types';

export async function authQueryApiKey(deps: AuthInstanceDeps, params: AuthQueryApiKeyParams): Promise<AuthApiKeyVerified | null> {
  const result = await deps.auth.api.verifyApiKey({ body: { key: params.key } });

  if (!result.valid || !result.key) {
    return null;
  }

  return { id: result.key.id, organizationId: result.key.referenceId };
}
