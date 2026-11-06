import { GIF_REACTION_EMOJI } from '@repo/contracts/universal';
import { match } from 'ts-pattern';
import { gifQueryProvider } from './gif-query.provider';
import { gifDriverAnime } from './gif.driver';
import type { GifPickParams, GifServiceDeps } from '../../types/gif.types';
import type { GifToolDetails } from '@repo/contracts/universal';

export async function gifActionPick(deps: GifServiceDeps, { reaction }: GifPickParams): Promise<GifToolDetails | null> {
  const emoji = GIF_REACTION_EMOJI[reaction];

  return match(await gifQueryProvider(deps))
    .with('off', () => null)
    .with('emoji', () => ({ provider: 'emoji' as const, emoji }))
    .with('anime', async () => {
      const url = await gifDriverAnime(reaction);

      return url ? { provider: 'anime' as const, url, emoji } : { provider: 'emoji' as const, emoji };
    })
    .exhaustive();
}
