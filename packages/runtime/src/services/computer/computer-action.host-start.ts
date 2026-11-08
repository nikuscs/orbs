import { match, P } from 'ts-pattern';
import { computerHostConnect, computerHostEnsureContainer } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export function computerActionHostStart(runtime: HostTypes.ComputerHostRuntime, { botId }: ComputerTypes.ComputerBotParams): Promise<void> {
  return match(runtime.starting.get(botId))
    .with(P.nonNullable, (pending) => pending)
    .otherwise(() => {
      const start = (async () => {
        await computerHostEnsureContainer(runtime, botId);
        await computerHostConnect(runtime, botId);
      })().finally(() => runtime.starting.delete(botId));

      runtime.starting.set(botId, start);

      return start;
    });
}
