import type { AuthActionCreateApiKeyParams, AuthApiKeyCreated, AuthInstanceDeps } from '#/types/auth.types';

export async function authActionCreateApiKey(deps: AuthInstanceDeps, params: AuthActionCreateApiKeyParams): Promise<AuthApiKeyCreated> {
  const created = await deps.auth.api.createApiKey({
    headers: params.headers,
    body: { name: params.name, organizationId: params.organizationId },
  });

  return {
    id: created.id,
    name: created.name ?? null,
    start: created.start ?? null,
    createdAt: created.createdAt,
    lastRequest: null,
    key: created.key,
  };
}
