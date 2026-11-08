import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import type { RuntimeComputerSweepDeps, RuntimeComputerSweepParams } from '../../types/runtime.types';

export async function runtimeActionSweepComputers({ directory, host }: RuntimeComputerSweepDeps, { botIds: existing }: RuntimeComputerSweepParams) {
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
      await match(existing.includes(botId))
        .with(false, () => host.actions.remove({ botId }))
        .with(true, async () => {
          const computers = await directory.bot(botId)
            .then((opened) => opened.deps.computers)
            .catch(() => undefined);

          await match(computers)
            .with(P.nonNullable, async (service) => {
              await match(await service.queries.live(BACKGROUND_CONTEXT))
                .with(true, () => undefined)
                .with(false, () => service.actions.shutdown(BACKGROUND_CONTEXT))
                .exhaustive();
            })
            .otherwise(() => host.actions.shutdown({ botId }));
        })
        .exhaustive();
    } catch (error) {
      log.error({
        tag: 'computer-sweep',
        message: 'Cannot clean up a leftover bot computer.',
        botId,
        error,
      });
    }
  }));
}
