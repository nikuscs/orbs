import { m } from '@repo/i18n/client';
import type { GifProvider } from '@repo/contracts/universal';

export const GIF_PROVIDER_LABELS = {
  emoji: m.settings_gifs_emoji,
  anime: m.settings_gifs_anime,
  off: m.settings_gifs_off,
} satisfies Record<GifProvider, () => string>;
