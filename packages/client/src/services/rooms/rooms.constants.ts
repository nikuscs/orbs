import { m } from '@repo/i18n/client';
import type { ConversationWhenBusy } from '@repo/contracts/universal';

export const ROOMS_MUTE_DURATIONS = [
  { duration: 60 * 60 * 1000, label: m.rooms_mute_1h },
  { duration: 8 * 60 * 60 * 1000, label: m.rooms_mute_8h },
  { duration: 24 * 60 * 60 * 1000, label: m.rooms_mute_24h },
  { duration: null, label: m.rooms_mute_forever },
] as const;

export const ROOMS_DRAG_PRESS = { delay: 250, tolerance: 5 };

export const ROOMS = {
  searchDebounceMs: 200,
  searchShortcuts: 9,
  searchSkeletonRows: 3,
  searchContextChars: 40,
  quickReactions: ['👍', '👎', '❤️', '😂', '🎉', '😮'],
  moreReactions: ['🔥', '👀', '🙏', '😢', '💯'],
  emojiSlowMs: 6000,
  emojiSkeletonCells: 40,
  quoteDelayMs: 1200,
  unreadSeenMs: 2500,
  mediaRecentMs: 7 * 24 * 60 * 60 * 1000,
  galleryTiles: 4,
  image: { box: 256, minRatio: 9 / 16, maxRatio: 2, loadingRatio: 4 / 3 },
  routinesRefreshMs: 60_000,
  todosRefreshMs: 15_000,
  draftKeyPrefix: 'bots.draft.',
  prefillEvent: 'bots.prefill',
  chime: { notesHz: [660, 880], noteSeconds: 0.12, volume: 0.12, fadeTo: 0.0001, closeMs: 1000 },
  recommendedChoice: '(Recommended)',
  timeGapMs: 60 * 60 * 1000,
  dayMs: 24 * 60 * 60 * 1000,
  weekDays: 7,
} as const;

export const ROOMS_SEND_MODE_DEFAULT = 'default';

export const ROOMS_SEND_MODES = {
  followUp: m.rooms_send_queue,
  steer: m.rooms_send_steer,
  interrupt: m.rooms_send_interrupt,
} satisfies Record<ConversationWhenBusy, () => string>;

export const ROOMS_APPROVAL_CHOICES = [
  { decision: 'approve', label: m.rooms_chat_approval_approve, tone: 'success' },
  { decision: 'always', label: m.rooms_chat_approval_always, tone: 'info' },
  { decision: 'deny', label: m.rooms_chat_approval_deny, tone: 'muted' },
] as const;

export const ROOMS_PRESENCE_EVENTS = ['pointerdown', 'keydown', 'wheel', 'focus'] as const;
