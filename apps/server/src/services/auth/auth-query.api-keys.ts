import type { AuthApiKey, AuthInstanceDeps, AuthQueryApiKeysParams } from '#/types/auth.types';

export async function authQueryApiKeys(deps: AuthInstanceDeps, params: AuthQueryApiKeysParams): Promise<AuthApiKey[]> {
  const result = await deps.auth.api.listApiKeys({
    headers: params.headers,
    query: { organizationId: params.organizationId, sortBy: 'createdAt', sortDirection: 'desc' },
  });

  return result.apiKeys.map((item) => ({
    id: item.id,
    name: item.name ?? null,
    start: item.start ?? null,
    createdAt: item.createdAt,
    lastRequest: item.lastRequest ?? null,
  }));
}
