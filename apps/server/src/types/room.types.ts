import emojiRegex from 'emoji-regex';
import { z } from 'zod';
import { daemonUsage } from '#/types/daemon.types';
import { STORAGE } from '#services/storage/storage.constants';
import { roomInputCreate } from './room-input.types';
import type { DatabaseTenant, DatabaseTenantFile, DatabaseTenantMessage } from '#/types/database-tenant.types';
import type { RoomInputSendMode } from '#/types/room-input.types';
import type { RouteDriverName } from '#/types/route-driver.types';
import type { RunRoom } from '#/types/run.types';
import type { TenantRoomSummary, TenantServicesDeps, TenantSockets } from '#/types/tenant.types';
import type { BotService } from '#services/bot/bot.service';
import type { RouteService } from '#services/route/route.service';
import type { RunService } from '#services/run/run.service';
import type { StorageService } from '#services/storage/storage.service';
import type { FileUIPart, UIMessage } from 'ai';

const roomRoutePick = z.object({
  botId: z.string(),
  botName: z.string(),
  score: z.number().nullable(),
});

export const roomIndexSearch = z.object({ start: z.boolean().optional() });

export const roomMessageRoute = z.object({
  via: z.enum(['mention', 'direct', 'lead', 'jev', 'none', 'budget', 'error', 'steer', 'reaction', 'reply', 'roundtable', 'judge', 'vision']),
  picks: z.array(roomRoutePick),
  absent: z.array(roomRoutePick).optional(),
});

export type RoomMessageRoute = z.infer<typeof roomMessageRoute>;

export const roomMessageReply = z.object({
  id: z.string(),
  authorName: z.string(),
  text: z.string(),
});

export type RoomMessageReply = z.infer<typeof roomMessageReply>;

export const roomMessageMetadata = z.object({
  authorId: z.string(),
  authorName: z.string(),
  seq: z.number(),
  runId: z.string().nullable(),
  route: roomMessageRoute.nullable(),
  usage: daemonUsage.nullable(),
  replyTo: roomMessageReply.nullable(),
  rerunOf: z.string().nullable(),
  triggerId: z.string().nullable(),
  createdAt: z.string(),
});

export type RoomMessageMetadata = z.infer<typeof roomMessageMetadata>;

export const roomMessageCompaction = z.object({ status: z.enum(['running', 'done']) });
export type RoomMessageCompaction = z.infer<typeof roomMessageCompaction>;

export const roomMessageRetry = z.object({ status: z.enum(['running', 'done']) });

export type RoomUIMessage = UIMessage<RoomMessageMetadata, { compaction: RoomMessageCompaction }>;

export const roomMessageParts = z.array(z.unknown());

export const roomMessageTextParts = z.array(z.object({ type: z.string(), text: z.string().optional() }));

export const roomMentionKind = z.enum(['bot', 'everyone', 'room', 'skill']);
export type RoomMentionKind = z.infer<typeof roomMentionKind>;

export const roomMentionElement = z.object({ 'data-href': z.string(), 'data-label': z.string() });

export const roomToolInput = z.record(z.string(), z.json());

export const roomToolText = z.string();

export interface RoomMentionTarget {
  kind: RoomMentionKind;
  id: string;
}

const roomBotIds = roomInputCreate.shape.botIds;

export const roomOpenTeamInput = roomInputCreate.pick({ name: true, botIds: true });

const roomArrangeIds = z.array(z.string().min(1)).max(1000).transform((ids) => [...new Set(ids)]);

export const roomArrangeInput = z.object({
  pinned: roomArrangeIds,
  placed: roomArrangeIds,
});

export const roomOpenDirectInput = z.object({
  botId: z.string().min(1),
});

export const roomResetInput = z.object({
  roomId: z.string().min(1),
  botIds: roomBotIds,
});

export const roomTimelineInput = z.object({
  roomId: z.string().min(1),
});

export const roomHistoryInput = z.object({
  roomId: z.string().min(1),
  before: z.string().min(1),
});

const roomSendFields = z.object({
  roomId: z.string().min(1),
  messageId: z.string().trim().min(1).max(64).optional(),
  text: z.string().trim().max(8000),
  fileIds: z.array(z.string().min(1).max(64)).max(STORAGE.maxFilesPerMessage).default([]),
  replyToMessageId: z.string().min(1).max(64).optional(),
});

export const roomSendInput = roomSendFields.refine((input) => input.text !== '' || input.fileIds.length > 0, { path: ['text'], error: 'validation_required' });

export const roomUploadInput = z.object({
  roomId: z.string().min(1),
  file: z.instanceof(File)
    .transform((file) => new File([file], file.name, { type: file.type.split(';', 1)[0].trim().toLowerCase() }))
    .refine((file) => file.size > 0 && file.size <= STORAGE.maxBytes, { error: 'validation_file_size' })
    .refine((file) => [...STORAGE.imageTypes, ...STORAGE.documentTypes].some((type) => type === file.type), { error: 'validation_file_type' }),
});

export const roomRemoveFileInput = z.object({
  roomId: z.string().min(1),
  fileId: z.string().min(1).max(64),
});

export const roomFilePart = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string(),
  url: z.string(),
});

export type RoomFilePart = z.infer<typeof roomFilePart>;

export const roomRerunInput = z.object({
  roomId: z.string().min(1),
});

export const roomSendOptions = roomSendFields.pick({ replyToMessageId: true, fileIds: true });

const roomReactionEmoji = z.string().min(1).max(64).refine((value) => emojiRegex().exec(value)?.[0] === value);

export const roomAddReactionInput = z.object({
  roomId: z.string().min(1),
  messageId: z.string().min(1).max(64),
  reactionId: z.string().min(1).max(64),
  emoji: roomReactionEmoji,
});

export const roomRemoveReactionInput = z.object({
  roomId: z.string().min(1),
  reactionId: z.string().min(1).max(64),
});

export const roomReactionsInput = z.object({
  roomId: z.string().min(1),
  fromSeq: z.int().positive(),
});

export interface RoomReactionGroup {
  emoji: string;
  count: number;
  names: string[];
  mine: string | null;
}

export type RoomReactions = Record<string, RoomReactionGroup[]>;

export interface RoomReactionResult {
  messageId: string;
  reactionId: string;
  active: boolean;
  groups: RoomReactionGroup[];
}

export type RoomAddReactionResult = RoomReactionResult | 'conflict' | null;

export type RoomRemoveReactionResult = RoomReactionResult | 'forbidden' | null;

export interface RoomTimeline {
  room: TenantRoomSummary;
  messages: DatabaseTenantMessage[];
  runs: RunRoom[];
}

export interface RoomSendResult {
  messageId: string;
}

export type RoomSendBlind = string[];

export type RoomSendOutcome = RoomSendResult | RoomSendBlind | 'empty' | 'files' | null;

export type RoomUploadResult = Pick<DatabaseTenantFile, 'id' | 'name' | 'mediaType' | 'size'>;

export type RoomFile = Pick<DatabaseTenantFile, 'roomId' | 'name' | 'mediaType'>;

export interface RoomActionAddFileParams {
  roomId: string;
  file: RoomUploadResult;
}

export interface RoomActionRemoveFileParams {
  roomId: string;
  fileId: string;
}

export type RoomRemoveFileResult = 'removed' | 'sent' | null;

export interface RoomQueryFileParams {
  fileId: string;
}

export interface RoomServiceDeps {
  bot: BotService;
  route: Pick<RouteService, 'actions' | 'queries'>;
  organizationId: string;
  database: DatabaseTenant;
  sockets: TenantSockets;
  run: Pick<RunService, 'actions' | 'queries'>;
  storage: StorageService;
  waitUntil: TenantServicesDeps['waitUntil'];
}

export interface RoomQueryGetParams {
  roomId: string;
}

export interface RoomQueryTimelineParams {
  roomId: string;
  limit?: number;
}

export interface RoomQueryHistoryParams {
  roomId: string;
  before: string;
}

export interface RoomQueryReactionsParams {
  roomId: string;
  userId: string;
  fromSeq: number;
  throughSeq?: number;
}

export interface RoomActionCreateParams {
  name: string;
  botIds: string[];
  description: string;
  driver: RouteDriverName | null;
  sendMode: RoomInputSendMode;
}

export type RoomActionOpenTeamParams = Pick<RoomActionCreateParams, 'name' | 'botIds'>;

export interface RoomActionOpenDirectParams {
  botId: string;
}

export interface RoomActionArrangeParams {
  pinned: string[];
  placed: string[];
}

export interface RoomActionUpdateParams {
  roomId: string;
  name?: string;
  botIds?: string[];
  description?: string;
  driver?: RouteDriverName | null;
  sendMode?: RoomInputSendMode;
}

export interface RoomActionDeleteParams {
  roomId: string;
  kind: 'group' | 'direct';
}

export interface RoomActionDeleteBotParams {
  botId: string;
}

export type RoomDeleteResult = 'deleted' | 'direct' | null;

export interface RoomActionResetParams {
  roomId: string;
  botIds: string[];
}

export type RoomResetResult = TenantRoomSummary | 'busy' | null;

export interface RoomActionSendParams {
  roomId: string;
  messageId?: string;
  text: string;
  fileIds: string[];
  rerunFiles?: FileUIPart[];
  replyToMessageId?: string;
  rerunOf?: string;
  userId: string;
  userName: string;
}

export interface RoomActionRerunParams {
  roomId: string;
  userId: string;
  userName: string;
}

export interface RoomActionAddReactionParams {
  roomId: string;
  messageId: string;
  reactionId: string;
  emoji: string;
  userId: string;
  userName: string;
}

export interface RoomActionRemoveReactionParams {
  roomId: string;
  reactionId: string;
  userId: string;
}
