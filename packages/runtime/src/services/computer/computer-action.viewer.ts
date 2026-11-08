import { match } from 'ts-pattern';
import { computerActionTakeControl } from './computer-action.take-control';
import { computerActionTouch } from './computer-action.touch';
import { COMPUTER } from './computer.constants';
import type { ComputerActionDeps, ComputerContextParams, ComputerViewerParams } from '../../types/computer.types';

export async function computerActionViewer(
  deps: ComputerActionDeps,
  { context, mode, isRenewal, principal }: ComputerViewerParams & ComputerContextParams,
) {
  await computerActionTouch(deps, { context });

  const ticket = await deps.host.actions.viewerTicket({
    botId: deps.botId,
    mode,
    principal,
    ttlSeconds: COMPUTER.viewerTicketSeconds,
  });

  await match(mode)
    .with('watch', () => undefined)
    .with('control', () => computerActionTakeControl(deps, {
      context,
      deviceId: principal.id,
      deviceName: principal.displayName,
      until: ticket.expiresAt,
      isRenewal,
    }))
    .exhaustive();

  return ticket;
}
