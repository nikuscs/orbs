import { renderSVG } from 'uqr';
import { authActionGrant } from './auth-action.grant';
import type { AuthPairParams, AuthServiceDeps } from '../../types/auth.types';
import type { AuthPairPayload } from '@repo/contracts/universal';

export async function authActionPair(deps: AuthServiceDeps, params: AuthPairParams) {
  const grant = await authActionGrant(deps, { issuedBy: params.issuedBy });

  const payload = btoa(JSON.stringify({
    version: 3,
    serverId: params.serverId,
    addresses: params.addresses,
    pin: grant.pin,
  } satisfies AuthPairPayload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');

  const link = `${deps.appScheme}://connect#code=${payload}`;

  const svg = renderSVG(link, { ecc: 'M', border: 4 });

  return { ...grant, qr: { payload, svg, link } };
}
