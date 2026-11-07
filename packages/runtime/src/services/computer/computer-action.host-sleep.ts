import { match } from 'ts-pattern';
import { computerHostTryThumbnail } from './computer-host.utils';
import { computerDriverInspect, computerDriverPause } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostSleep(runtime: HostTypes.ComputerHostRuntime, { botId }: ComputerTypes.ComputerBotParams): Promise<void> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  await match(inspected?.status)
    .with('running', async () => {
      await computerHostTryThumbnail(runtime, botId);
      await computerDriverPause(runtime.socket, botId);
    })
    .otherwise(() => undefined);
}
