import { TENANT } from './tenant.constants';
import { tenantFileHeaders } from './tenant.utils';
import type { TenantQueryFileParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryFile(deps: TenantServiceDeps, params: TenantQueryFileParams): Promise<Response> {
  const fileId = new URL(params.request.url).pathname.slice(TENANT.filePath.length);
  const key = params.request.headers.get(TENANT.daemonKeyHeader);
  const verified = key ? await deps.auth.queries.apiKey({ key }) : null;
  const session = verified ? null : await deps.auth.queries.session({ headers: params.request.headers });
  const organizationId = verified?.organizationId ?? (session && !session.user.ban ? session.organization.id : null);

  if (!organizationId) {
    return new Response(null, { status: 401 });
  }

  const file = await deps.namespace.getByName(organizationId).roomFile({ fileId });

  if (!file) {
    return new Response(null, { status: 404 });
  }

  const object = await deps.storage.queries.get({
    organizationId,
    roomId: file.roomId,
    fileId,
  });

  if (!object) {
    return new Response(null, { status: 404 });
  }

  return new Response(object.body, { headers: tenantFileHeaders(file) });
}
