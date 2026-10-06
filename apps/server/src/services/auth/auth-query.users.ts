import { authBan } from './auth.utils';
import type { AuthAdminUsers, AuthInstanceDeps, AuthQueryUsersParams } from '#/types/auth.types';

export async function authQueryUsers(deps: AuthInstanceDeps, params: AuthQueryUsersParams): Promise<AuthAdminUsers> {
  const result = await deps.auth.api.listUsers({
    headers: params.headers,
    query: {
      searchValue: params.search,
      searchField: 'email',
      searchOperator: 'contains',
      limit: params.limit,
      offset: params.offset,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
  });

  return {
    total: result.total,
    users: result.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? null,
      ban: authBan(user),
      banReason: user.banReason ?? null,
      createdAt: user.createdAt,
    })),
  };
}
