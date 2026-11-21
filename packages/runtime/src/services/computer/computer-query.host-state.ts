import { match } from 'ts-pattern';
import { computerDriverInspect } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostState(
  runtime: HostTypes.ComputerHostRuntime,
  { botId }: ComputerTypes.ComputerBotParams,
): Promise<ComputerTypes.ComputerHostState> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  return match(inspected?.status)
    .with('running', () => 'running' as const)
    .with('paused', () => 'sleeping' as const)
    .otherwise(() => 'off' as const);
}
