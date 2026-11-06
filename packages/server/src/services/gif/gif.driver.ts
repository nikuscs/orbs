import { GIF, gifAnimeResult } from '@repo/contracts/universal';
import type { GifReaction } from '@repo/contracts/universal';

export async function gifDriverAnime(reaction: GifReaction): Promise<string | null> {
  const url = new URL('/gif', GIF.animeOrigin);
  url.searchParams.set('reaction', reaction);

  const response = await fetch(url, { signal: AbortSignal.timeout(GIF.animeTimeoutMs) }).catch(() => null);
  const result = gifAnimeResult.safeParse(response?.ok ? await response.json().catch(() => null) : null);
  const media = result.success ? new URL(result.data.url) : null;

  return media?.protocol === 'https:' && media.hostname === GIF.animeMediaHost ? media.href : null;
}
