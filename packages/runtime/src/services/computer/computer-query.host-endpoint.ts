import { computerDriverInspect } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostEndpoint(runtime: HostTypes.ComputerHostRuntime, { botId }: ComputerTypes.ComputerBotParams): Promise<string | null> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  return inspected?.status === 'running' && inspected.port !== null ? `http://127.0.0.1:${inspected.port}` : null;
}
