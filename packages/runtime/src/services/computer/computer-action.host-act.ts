import { setTimeout as sleep } from 'node:timers/promises';
import { computerHostResponseEmpty } from '../../types/computer-host.types';
import { computerHostInputRequest } from './computer-host-input.utils';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostCall, computerHostPrepare } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostAct(runtime: HostTypes.ComputerHostRuntime, { botId, input }: ComputerTypes.ComputerActParams): Promise<void> {
  const session = await computerHostPrepare(runtime, botId);
  const request = computerHostInputRequest(input);

  await computerHostCall(session.client, request.method, request.body, computerHostResponseEmpty);
  await sleep(COMPUTER_HOST.settleMs);
}
