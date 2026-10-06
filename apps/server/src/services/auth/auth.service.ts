import { betterAuth } from 'better-auth';
import { authEndedSession } from '#/types/auth.types';
import { authActionBanUser } from './auth-action.ban-user';
import { authActionCreateApiKey } from './auth-action.create-api-key';
import { authActionDeleteApiKey } from './auth-action.delete-api-key';
import { authActionUnbanUser } from './auth-action.unban-user';
import { authQueryApiKey } from './auth-query.api-key';
import { authQueryApiKeys } from './auth-query.api-keys';
import { authQuerySession } from './auth-query.session';
import { authQueryUsers } from './auth-query.users';
import { authOptions } from './auth.options';
import type * as AuthTypes from '#/types/auth.types';

export function makeAuthService({ env, database, mail, organization, disconnect }: AuthTypes.AuthServiceDeps) {
  const auth: AuthTypes.AuthInstance = betterAuth(authOptions({
    env,
    database,
    mail,
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const active = await organization.actions.ensure({ userId: session.userId });

            return { data: { ...session, activeOrganizationId: active.id } };
          },
        },
        delete: {
          after: async (session) => {
            const ended = authEndedSession.parse(session);

            if (ended.activeOrganizationId) {
              await disconnect({ organizationId: ended.activeOrganizationId, owner: { kind: 'session', id: ended.id } });
            }
          },
        },
      },
    },
  }));

  const instance: AuthTypes.AuthInstanceDeps = { auth, organization, disconnect, sessions: new WeakMap() };

  return {
    handler: (request: Request) => auth.handler(request),
    queries: {
      session: (params: AuthTypes.AuthQuerySessionParams) => authQuerySession(instance, params),
      apiKeys: (params: AuthTypes.AuthQueryApiKeysParams) => authQueryApiKeys(instance, params),
      apiKey: (params: AuthTypes.AuthQueryApiKeyParams) => authQueryApiKey(instance, params),
      users: (params: AuthTypes.AuthQueryUsersParams) => authQueryUsers(instance, params),
    },
    actions: {
      createApiKey: (params: AuthTypes.AuthActionCreateApiKeyParams) => authActionCreateApiKey(instance, params),
      deleteApiKey: (params: AuthTypes.AuthActionDeleteApiKeyParams) => authActionDeleteApiKey(instance, params),
      banUser: (params: AuthTypes.AuthActionBanUserParams) => authActionBanUser(instance, params),
      unbanUser: (params: AuthTypes.AuthActionUnbanUserParams) => authActionUnbanUser(instance, params),
    },
  };
}

export type AuthService = ReturnType<typeof makeAuthService>;
