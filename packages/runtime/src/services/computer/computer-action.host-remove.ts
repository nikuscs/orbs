import { log } from '@repo/logger/server';
import { rm } from 'node:fs/promises';
import { computerActionHostShutdown } from './computer-action.host-shutdown';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostPaths } from './computer-host.utils';
import { computerDriverRemove, computerDriverRemoveVolume } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostRemove(runtime: HostTypes.ComputerHostRuntime, params: ComputerTypes.ComputerBotParams): Promise<void> {
  await computerActionHostShutdown(runtime, params)
    .then(() => computerDriverRemove(runtime.socket, params.botId))
    .then(() => computerDriverRemoveVolume(runtime.socket, params.botId))
    .catch((error: unknown) => log.error({
      tag: 'computer',
      message: 'Removing the computer container failed; deleting its credential and folder anyway.',
      botId: params.botId,
      error,
    }));

  await runtime.credentials.actions.set({ key: COMPUTER_HOST.credentialKey(params.botId), value: null });
  await rm(computerHostPaths(runtime, params.botId).directory, { recursive: true, force: true });
}
