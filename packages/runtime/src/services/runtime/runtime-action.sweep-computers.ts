import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { log } from '@repo/logger/server';
import { match } from 'ts-pattern';
import type { RuntimeComputerSweepDeps } from '../../types/runtime.types';

export async function runtimeActionSweepComputers({ directory, host }: RuntimeComputerSweepDeps) {
  const botIds = await host.queries.list().catch((error: unknown) => {
    log.warn({
      tag: 'computer-sweep',
      message: 'Cannot list the bot computers.',
      error,
    });

    return [];
  });

  await Promise.all(botIds.map(async (botId) => {
    try {
      const bot = await directory.bot(botId).catch(() => null);

      await match(bot?.deps.computers)
        .with(undefined, () => host.actions.shutdown({ botId }))
        .otherwise(async (computers) => {
          await match(await computers.queries.live(BACKGROUND_CONTEXT))
            .with(true, () => undefined)
            .with(false, () => computers.actions.shutdown(BACKGROUND_CONTEXT))
            .exhaustive();
        });
    } catch (error) {
      log.error({
        tag: 'computer-sweep',
        message: 'Cannot shut down a leftover bot computer.',
        botId,
        error,
      });
    }
  }));
}
