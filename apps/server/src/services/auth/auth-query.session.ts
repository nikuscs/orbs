import { authBan } from './auth.utils';
import type { AuthInstanceDeps, AuthQuerySessionParams, AuthSession } from '#/types/auth.types';

export function authQuerySession(deps: AuthInstanceDeps, params: AuthQuerySessionParams): Promise<AuthSession | null> {
  async function authReadSession(
    serviceDeps: AuthInstanceDeps,
    input: AuthQuerySessionParams,
  ): Promise<AuthSession | null> {
    const { response: data, headers } = await serviceDeps.auth.api.getSession({ headers: input.headers, returnHeaders: true });

    for (const cookie of headers.getSetCookie()) {
      input.onCookie?.(cookie);
    }

    if (!data) {
      return null;
    }

    const organization = await serviceDeps.organization.queries.active({
      userId: data.user.id,
      activeOrganizationId: data.session.activeOrganizationId,
    });

    if (!organization) {
      return null;
    }

    return {
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image ?? null,
        username: data.user.username ?? null,
        role: data.user.role ?? null,
        ban: authBan(data.user),
      },
      session: {
        id: data.session.id,
        expiresAt: data.session.expiresAt,
      },
      organization,
    };
  }

  const session = deps.sessions.get(params.headers) ?? authReadSession(deps, params);
  deps.sessions.set(params.headers, session);

  return session;
}
