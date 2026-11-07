import { assertValidOp } from '@earendil-works/chord/delta';
import { type } from '@orpc/contract';
import { z } from 'zod';
import { attachmentIds } from './attachment.types';
import { botAvatar } from './bot.types';
import { gifProvider } from './gif.types';
import { questionAnswerInput, questionChoices, questionText } from './question.types';
import { REACTION, reactionEmoji } from './reaction.types';
import { secretRule } from './secret.types';
import type { SidebarSection } from './sidebar-section.types';
import type { JsonValue } from '@earendil-works/chord';
import type { Op } from '@earendil-works/chord/delta';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export interface ConversationRun {
  taskId: number;
  status: PiDurableTypes.TaskState<JsonValue, JsonValue>['status'];
  outcome: PiDurableTypes.TaskOutcome<JsonValue> | null;
}

export interface ConversationState {
  conversationId: number;
  latestEntryId: number;
  live: PiDurableTypes.LiveState;
  inbox: PiDurableTypes.InboxState;
  lastRun: ConversationRun | null;
  interactionsRevision: number;
  artifactsRevision: number;
}

export interface ConversationContextWatchState {
  revision: number;
}

export interface ConversationView extends ConversationState {
  entries: readonly PiDurableTypes.EntryRecord[];
  historyCursor?: PiDurableTypes.Cursor;
}

export const conversationFrame = z.array(z.custom<Op>((value) => {
  try {
    assertValidOp(value);
    return true;
  } catch {
    return false;
  }
})).readonly();

export type ConversationFrame = z.infer<typeof conversationFrame>;

export const conversationTarget = z.object({
  botId: z.uuid(),
  conversationId: z.number().int().positive().optional(),
});

export const conversationContent = z.string().min(1).max(64_000);

export const conversationSubmit = conversationTarget.extend({
  requestId: z.string().min(1).max(128),
  replyToEntryId: z.number().int().positive().optional(),
  content: z.string().max(64_000).default(''),
  attachmentIds: attachmentIds.default([]),
  skills: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
  whenBusy: z.enum(['followUp', 'steer', 'reject', 'interrupt']).optional(),
}).refine((value) => value.content.length > 0 || value.attachmentIds.length > 0 || (value.skills?.length ?? 0) > 0);

export const conversationUpdateSubmission = conversationTarget.extend({
  submissionId: z.number().int().positive(),
  replyToEntryId: z.number().int().positive().nullable().optional(),
  content: z.string().max(64_000).optional(),
  attachmentIds: attachmentIds.optional(),
  skills: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
  whenBusy: z.enum(['followUp', 'steer', 'interrupt']).optional(),
})
  .refine((value) => value.content !== undefined || value.whenBusy !== undefined || value.attachmentIds !== undefined || value.replyToEntryId !== undefined)
  .refine((value) => value.skills === undefined || value.content !== undefined);

export const conversationUpdateSubmissionResult = z.void();

export const conversationSubmitResult = z.object({
  submissionId: z.number().int().positive(),
});

export const conversationStopResult = z.void();

export const conversationClearResult = z.void();

export const conversationHistory = conversationTarget.extend({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.record(z.string(), z.json()).optional(),
  afterEntryId: z.number().int().nonnegative().optional(),
  throughEntryId: z.number().int().positive().optional(),
});

export type ConversationHistoryPage = PiDurableTypes.Page<PiDurableTypes.EntryRecord, PiDurableTypes.Cursor>;
export const conversationHistoryResult = type<ConversationHistoryPage>();
export type ConversationHistoryInput = z.infer<typeof conversationHistory>;

export type ConversationSubmitInput = z.infer<typeof conversationSubmit>;
export type ConversationUpdateSubmissionInput = z.infer<typeof conversationUpdateSubmission>;
export type ConversationTarget = z.infer<typeof conversationTarget>;

export const conversationContexts = conversationTarget.extend({
  kind: z.enum(['subagent', 'private']),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.record(z.string(), z.json()).optional(),
});

const conversationContext = z.object({
  botId: z.uuid(),
  conversationId: z.number().int().positive(),
  isRunning: z.boolean(),
});

export const conversationContextItem = z.discriminatedUnion('kind', [
  conversationContext.extend({
    kind: z.literal('subagent'),
    name: z.string().nullable(),
    ownerTaskId: z.number().int().positive(),
    isBackground: z.boolean(),
  }),
  conversationContext.extend({
    kind: z.literal('private'),
    createdAt: z.number(),
  }),
]);

export const conversationContextPage = z.object({
  items: z.array(conversationContextItem),
  next: z.record(z.string(), z.json()).optional(),
});

export type ConversationContextsInput = z.infer<typeof conversationContexts>;
export type ConversationContextItem = z.infer<typeof conversationContextItem>;
export type ConversationContextPage = z.infer<typeof conversationContextPage>;

export const conversationWhenBusy = z.enum(['followUp', 'steer', 'interrupt']);

export const conversationPreferences = z.object({
  isPinned: z.boolean(),
  isHidden: z.boolean(),
  isMuted: z.boolean(),
  mutedUntil: z.number().int().positive().nullable(),
  rank: z.number().int().nonnegative().nullable(),
  sectionId: z.uuid().nullable(),
  readThroughEntryId: z.number().int().nonnegative(),
  hasUnread: z.boolean(),
  whenBusy: conversationWhenBusy.nullable(),
});

export const conversationMarkRead = z.object({
  botId: z.uuid(),
  throughEntryId: z.number().int().positive(),
});

export const conversationSetPinned = z.object({
  botId: z.uuid(),
  isPinned: z.boolean(),
});

export const conversationSummary = conversationPreferences.extend({
  botId: z.uuid(),
  conversationId: z.number().int().positive(),
  lastMessage: z.object({
    entryId: z.number().int().positive(),
    role: z.enum(['user', 'assistant']),
    preview: z.string().max(160),
    createdAt: z.number(),
  }).nullable(),
  isRunning: z.boolean(),
  isWorking: z.boolean(),
});

export const conversationList = z.array(conversationSummary.extend({
  name: z.string(),
  handle: z.string(),
  avatar: botAvatar.nullable(),
}));

export type ConversationSummary = z.infer<typeof conversationSummary>;
export type ConversationListItem = z.infer<typeof conversationList>[number];

export interface ConversationListState {
  conversations: ConversationListItem[];
  sections: SidebarSection[];
}

export type ConversationPreferences = z.infer<typeof conversationPreferences>;
export type ConversationMarkReadInput = z.infer<typeof conversationMarkRead>;
export type ConversationSetPinnedInput = z.infer<typeof conversationSetPinned>;

export const conversationSetHidden = z.object({
  botId: z.uuid(),
  isHidden: z.boolean(),
});

export const conversationSetMuted = z.object({
  botId: z.uuid(),
  isMuted: z.boolean(),
  mutedUntil: z.number().int().positive().nullable().default(null),
});

export const conversationArrange = z.object({
  botIds: z.array(z.uuid()).max(1000).refine((ids) => new Set(ids).size === ids.length),
  isPinned: z.boolean(),
  sectionId: z.uuid().nullable().optional(),
});

export const conversationArrangeResult = z.void();

export const conversationSetWhenBusy = z.object({
  botId: z.uuid(),
  whenBusy: conversationWhenBusy.nullable(),
});

export const conversationSettings = z.object({
  whenBusy: conversationWhenBusy,
  hideVerbose: z.boolean(),
  gifProvider,
});

export const conversationConfigure = conversationSettings.partial();

export type ConversationSetHiddenInput = z.infer<typeof conversationSetHidden>;
export type ConversationSetMutedInput = z.infer<typeof conversationSetMuted>;
export type ConversationArrangeInput = z.infer<typeof conversationArrange>;
export type ConversationWhenBusy = z.infer<typeof conversationWhenBusy>;
export type ConversationSetWhenBusyInput = z.infer<typeof conversationSetWhenBusy>;
export type ConversationSettings = z.infer<typeof conversationSettings>;
export type ConversationConfigureInput = z.infer<typeof conversationConfigure>;

export const conversationHistoryMessage = z.object({
  entryId: z.number().int().positive(),
  role: z.enum(['user', 'assistant']),
  botId: z.uuid().optional(),
  text: z.string().min(1),
  createdAt: z.number().int(),
});

export const conversationSearch = conversationTarget.extend({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.record(z.string(), z.json()).optional(),
});

export const conversationSearchResult = z.object({
  messages: z.array(conversationHistoryMessage),
  cursor: z.record(z.string(), z.json()).optional(),
  hasMore: z.boolean(),
});

export type ConversationHistoryMessage = z.infer<typeof conversationHistoryMessage>;
export type ConversationSearchInput = z.infer<typeof conversationSearch>;
export type ConversationSearchPage = z.infer<typeof conversationSearchResult>;

export const conversationQuestion = z.object({
  id: z.number().int().positive(),
  botId: z.uuid(),
  conversationId: z.number().int().positive(),
  privateWith: z.uuid().nullable(),
  text: questionText,
  choices: questionChoices,
  isMultiSelect: z.boolean(),
  secret: secretRule.nullable(),
  createdAt: z.number().int(),
  expiresAt: z.number().int(),
});

export const conversationQuestionList = z.array(conversationQuestion);

export const conversationAnswerQuestion = conversationTarget.extend({
  id: z.number().int().positive(),
  answer: questionAnswerInput,
});

export const conversationAnswerQuestionResult = z.object({
  isAccepted: z.boolean(),
});

export type ConversationQuestion = z.infer<typeof conversationQuestion>;
export type ConversationQuestionList = z.infer<typeof conversationQuestionList>;
export type ConversationAnswerQuestionInput = z.infer<typeof conversationAnswerQuestion>;
export type ConversationAnswerQuestionResult = z.infer<typeof conversationAnswerQuestionResult>;

export const conversationSetReaction = conversationTarget.extend({
  entryId: z.number().int().positive(),
  emoji: reactionEmoji,
  isPresent: z.boolean(),
});

export const conversationBotReaction = z.object({
  botId: z.uuid(),
  emojis: z.array(reactionEmoji).max(REACTION.maxPerEntry),
});

export const conversationReaction = z.object({
  entryId: z.number().int().positive(),
  emojis: z.array(reactionEmoji).max(REACTION.maxPerEntry),
  botReactions: z.array(conversationBotReaction),
});

export const conversationSetReactionResult = conversationReaction;

export const conversationReactions = conversationTarget.extend({
  entryIds: z.array(z.number().int().positive()).max(100).refine((ids) => new Set(ids).size === ids.length),
});

export const conversationReactionsResult = z.array(conversationReaction);

export type ConversationSetReactionInput = z.infer<typeof conversationSetReaction>;
export type ConversationReactionsInput = z.infer<typeof conversationReactions>;
export type ConversationBotReaction = z.infer<typeof conversationBotReaction>;
export type ConversationReaction = z.infer<typeof conversationReaction>;
