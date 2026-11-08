import { rm } from 'node:fs/promises';
import { computerActionHostShutdown } from './computer-action.host-shutdown';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostPaths } from './computer-host.utils';
import { computerDriverRemove, computerDriverRemoveVolume } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostRemove(runtime: HostTypes.ComputerHostRuntime, params: ComputerTypes.ComputerBotParams): Promise<void> {
  await computerActionHostShutdown(runtime, params);
  await computerDriverRemove(runtime.socket, params.botId);
  await computerDriverRemoveVolume(runtime.socket, params.botId);
  await runtime.credentials.actions.set({ key: COMPUTER_HOST.credentialKey(params.botId), value: null });
  await rm(computerHostPaths(runtime, params.botId).directory, { recursive: true, force: true });
}
