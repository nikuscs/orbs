import { z } from 'zod';

export const gifReaction = z.enum([
  'laugh',
  'celebrate',
  'yay',
  'clap',
  'thumbsup',
  'love',
  'blush',
  'wink',
  'cool',
  'dance',
  'wave',
  'surprised',
  'scared',
  'cry',
  'mad',
  'roll',
  'sleep',
]);

export const GIF = {
  toolName: 'bot_gif',
  emojiOrigin: 'https://fonts.gstatic.com/s/e/notoemoji/latest',
  emojiFile: '512.webp',
  animeOrigin: 'https://api.otakugifs.xyz',
  animeMediaHost: 'cdn.otakugifs.xyz',
  animeTimeoutMs: 5000,
} as const;

export const GIF_REACTION_EMOJI = {
  laugh: '😂',
  celebrate: '🎉',
  yay: '🥳',
  clap: '👏',
  thumbsup: '👍',
  love: '❤️',
  blush: '😊',
  wink: '😉',
  cool: '😎',
  dance: '💃',
  wave: '👋',
  surprised: '😮',
  scared: '😱',
  cry: '😭',
  mad: '😡',
  roll: '🙄',
  sleep: '😴',
} as const satisfies Record<z.infer<typeof gifReaction>, string>;

export const gifProvider = z.enum(['emoji', 'anime', 'off']);

export const gifToolCall = z.object({ reaction: gifReaction });

export const gifToolDetails = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('emoji'), emoji: z.string().min(1) }),
  z.object({
    provider: z.literal('anime'),
    url: z.url(),
    emoji: z.string().min(1),
  }),
]);

export const gifAnimeResult = z.object({ url: z.url() });

export type GifProvider = z.infer<typeof gifProvider>;
export type GifReaction = z.infer<typeof gifReaction>;
export type GifToolDetails = z.infer<typeof gifToolDetails>;
