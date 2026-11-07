import { match } from 'ts-pattern';
import { computerHostCloseSession, computerHostTryThumbnail } from './computer-host.utils';
import { computerDriverInspect, computerDriverStop, computerDriverUnpause } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostShutdown(runtime: HostTypes.ComputerHostRuntime, { botId }: ComputerTypes.ComputerBotParams): Promise<void> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  await match(inspected?.status)
    .with('running', async () => {
      await computerHostTryThumbnail(runtime, botId);
      await computerHostCloseSession(runtime, botId);
      await computerDriverStop(runtime.socket, botId);
    })
    .with('paused', async () => {
      await computerHostCloseSession(runtime, botId);
      await computerDriverUnpause(runtime.socket, botId);
      await computerDriverStop(runtime.socket, botId);
    })
    .otherwise(() => computerHostCloseSession(runtime, botId));
}
