import { COMPUTER_HOST } from './computer-host.constants';
import { computerDriverList, computerDriverListVolumes } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';

export async function computerQueryHostList(runtime: HostTypes.ComputerHostRuntime): Promise<string[]> {
  const [containers, volumes] = await Promise.all([
    computerDriverList(runtime.socket),
    computerDriverListVolumes(runtime.socket),
  ]);

  const botIds = [...new Set([...containers, ...volumes])];

  const owned = await Promise.all(botIds.map(async (botId) => (
    await runtime.credentials.queries.get({ key: COMPUTER_HOST.credentialKey(botId) }) === null ? [] : [botId]
  )));

  return owned.flat();
}
