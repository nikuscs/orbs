import { TENANT } from './tenant.constants';
import { tenantSocketTag } from './tenant.utils';
import type { TenantActionSocketAuthorizeParams, TenantServiceDeps, TenantSocketAuthorization } from '#/types/tenant.types';

export async function tenantActionSocketAuthorize(deps: TenantServiceDeps, params: TenantActionSocketAuthorizeParams): Promise<TenantSocketAuthorization> {
  const { request } = params;

  if (new URL(request.url).pathname === TENANT.daemonSocketPath) {
    const key = request.headers.get(TENANT.daemonKeyHeader);
    const verified = key ? await deps.auth.queries.apiKey({ key }) : null;

    return verified
      ? { ok: true, organizationId: verified.organizationId, ownerTag: tenantSocketTag({ kind: 'key', id: verified.id }) }
      : { ok: false, status: 401 };
  }

  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return { ok: false, status: 403 };
  }

  const session = await deps.auth.queries.session({ headers: request.headers });

  if (!session || session.user.ban) {
    return { ok: false, status: 401 };
  }

  return { ok: true, organizationId: session.organization.id, ownerTag: tenantSocketTag({ kind: 'session', id: session.session.id }) };
}
