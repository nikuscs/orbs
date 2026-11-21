import { generateCACertificate, getLocal } from 'mockttp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rootCertificates } from 'node:tls';
import { secretProxyActionScrub } from './secret-proxy-action.scrub';
import { secretProxyActionSwap } from './secret-proxy-action.swap';
import { SECRET_PROXY } from './secret-proxy.constants';
import { secretProxyCarries, secretProxyIsLocal } from './secret-proxy.utils';
import type { SecretProxyServiceDeps } from '../../types/secret-proxy.types';
import type { CompletedRequest } from 'mockttp';

const refused = { response: { statusCode: 403, body: 'The secret proxy only accepts local connections.\n' } };

export function secretProxyActionStart(deps: SecretProxyServiceDeps) {
  async function secretProxyStart() {
    const secretProxyAuthorized = (request: CompletedRequest) => secretProxyIsLocal(request.remoteIpAddress);

    const ca = await generateCACertificate();
    const server = getLocal({ https: ca });

    await mkdir(deps.folder, { recursive: true, mode: 0o700 });
    await writeFile(join(deps.folder, SECRET_PROXY.bundleFile), [ca.cert, ...rootCertificates].join('\n'), { mode: 0o644 });

    await server.forAnyRequest().always().matching(secretProxyCarries).thenPassThrough({
      beforeRequest: (request) => (secretProxyAuthorized(request) ? secretProxyActionSwap(deps, { request }) : refused),
      beforeResponse: (response, request) => secretProxyActionScrub(deps, { response, request }),
    });

    await server.forAnyRequest().always().thenPassThrough({
      beforeRequest: (request) => (secretProxyAuthorized(request) ? undefined : refused),
    });

    await server.start();

    deps.state.server = server;
  }

  deps.state.starting ??= secretProxyStart().catch((error: unknown) => {
    deps.state.starting = null;
    throw error;
  });

  return deps.state.starting;
}
