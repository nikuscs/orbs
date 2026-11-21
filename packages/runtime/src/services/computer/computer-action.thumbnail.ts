import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import type { ComputerServiceDeps } from '../../types/computer.types';
import type { ComputerThumbnail } from '@repo/contracts/universal';

export async function computerActionThumbnail({ host, botId }: ComputerServiceDeps): Promise<ComputerThumbnail> {
  const live = await match(await host.queries.state({ botId }))
    .with('running', () => host.actions.thumbnail({ botId }).catch((error: unknown) => {
      log.warn({
        tag: 'computer',
        message: 'A live thumbnail failed; showing the saved one.',
        botId,
        error,
      });

      return null;
    }))
    .otherwise(() => null);

  return match(live)
    .with(P.nonNullable, (file) => ({ ...file, isLive: true }))
    .otherwise(async () => {
      const saved = await host.queries.savedThumbnail({ botId });

      return match(saved)
        .with(P.nonNullable, (file) => ({ ...file, isLive: false }))
        .otherwise(() => null);
    });
}
