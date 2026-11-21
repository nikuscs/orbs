import { match } from 'ts-pattern';
import { computerHostResponseTicket } from '../../types/computer-host.types';
import { computerHostCall, computerHostPrepare } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostViewerTicket(
  runtime: HostTypes.ComputerHostRuntime,
  { botId, mode, principal, ttlSeconds }: ComputerTypes.ComputerViewerTicketParams,
): Promise<ComputerTypes.ComputerViewerTicket> {
  const session = await computerHostPrepare(runtime, botId);

  const response = await computerHostCall(session.client, 'SystemService/CreateViewerTicket', {
    ttl: `${ttlSeconds}s`,
    policy: match(mode)
      .with('watch', () => 'SESSION_POLICY_VIEW_ONLY')
      .with('control', () => 'SESSION_POLICY_ALLOW_ACTIVATION')
      .exhaustive(),
    principal: { id: principal.id, displayName: principal.displayName },
  }, computerHostResponseTicket);

  return { viewerPath: response.viewerPath, expiresAt: Date.parse(response.expiresAt) };
}
