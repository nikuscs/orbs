import { z } from 'zod';
import { daemonRunFailure } from '#/types/daemon.types';
import { roomMessageRoute } from '#/types/room.types';
import type { DaemonServerMessage } from '#/types/daemon.types';
import type { DatabaseTenant, DatabaseTenantMessage, DatabaseTenantRoom } from '#/types/database-tenant.types';
import type { Database } from '#/types/database.types';
import type { RoomInputSendMode } from '#/types/room-input.types';
import type { RoomUIMessage } from '#/types/room.types';
import type { RouteDriverName } from '#/types/route-driver.types';
import type { RouteDrivers, RouteJudgeRequests } from '#/types/route.types';
import type { RunRoom } from '#/types/run.types';
import type { AuthService } from '#services/auth/auth.service';
import type { BotService } from '#services/bot/bot.service';
import type { HarnessService } from '#services/harness/harness.service';
import type { McpInternalService } from '#services/mcp-internal/mcp-internal.service';
import type { MemoryCaptureService } from '#services/memory-capture/memory-capture.service';
import type { MemoryStateService } from '#services/memory-state/memory-state.service';
import type { MemoryService } from '#services/memory/memory.service';
import type { OrganizationService } from '#services/organization/organization.service';
import type { RoomService } from '#services/room/room.service';
import type { RouteService } from '#services/route/route.service';
import type { RunService } from '#services/run/run.service';
import type { StorageService } from '#services/storage/storage.service';
import type { TenantCallsService } from '#services/tenant/tenant-calls.service';
import type * as MemoryCaptureTypes from './memory-capture.types';
import type * as MemoryStateTypes from './memory-state.types';
import type { MemoryWipeInput } from './memory.types';
import type { TenantCallsGate } from './tenant-calls.types';
import type { EnvServer } from '@orbs/env/server';
import type { TypeSafeClient } from '@typesafe-ai/sdk';
import type { UIMessageChunk } from 'ai';

const tenantRoomKind = z.enum(['group', 'direct']);
export type TenantRoomKind = z.infer<typeof tenantRoomKind>;

const tenantRunActivity = z.enum(['thinking', 'working', 'writing', 'compacting', 'retrying']);
export type TenantRunActivity = z.infer<typeof tenantRunActivity>;

const tenantMessage = z.object({
  id: z.string(),
  roomId: z.string(),
  seq: z.number(),
  role: z.enum(['user', 'assistant']),
  authorId: z.string(),
  authorName: z.string(),
  runId: z.string().nullable(),
  parts: z.string(),
  route: z.string().nullable(),
  usage: z.string().nullable(),
  replyTo: z.string().nullable(),
  rerunOf: z.string().nullable(),
  triggerId: z.string().nullable(),
  reactionId: z.string().nullable(),
  createdAt: z.string(),
}) satisfies z.ZodType<DatabaseTenantMessage>;

const tenantPreview = z.object({
  authorName: z.string(),
  text: z.string(),
  createdAt: z.string(),
}) satisfies z.ZodType<TenantRoomLastMessage>;

const tenantRun = z.object({
  id: z.string(),
  roomId: z.string(),
  botId: z.string(),
  botName: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted']),
  failure: daemonRunFailure.nullable(),
  activity: tenantRunActivity,
  seat: z.enum(['required', 'optional', 'backstop']),
}) satisfies z.ZodType<RunRoom>;

export const tenantEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('memory.updated') }),
  z.object({ type: z.literal('bot.deleted'), botId: z.string() }),
  z.object({ type: z.literal('bot.updated'), botId: z.string() }),
  z.object({ type: z.literal('tenant.connected') }),
  z.object({
    type: z.literal('message.created'),
    roomId: z.string(),
    message: tenantMessage,
    preview: tenantPreview,
  }),
  z.object({
    type: z.literal('run.updated'),
    roomId: z.string(),
    runs: z.array(tenantRun),
  }),
  z.object({
    type: z.literal('run.activity'),
    roomId: z.string(),
    runId: z.string(),
    activity: tenantRunActivity,
  }),
  z.object({
    type: z.literal('message.routed'),
    roomId: z.string(),
    messageId: z.string(),
    route: roomMessageRoute,
  }),
  z.object({ type: z.literal('room.updated'), roomId: z.string() }),
  z.object({ type: z.literal('room.deleted'), roomId: z.string() }),
  z.object({ type: z.literal('rooms.arranged') }),
  z.object({
    type: z.literal('reaction.updated'),
    roomId: z.string(),
    messageId: z.string(),
  }),
  z.object({
    type: z.literal('run.chunk'),
    roomId: z.string(),
    runId: z.string(),
    chunkId: z.number(),
    chunk: z.custom<UIMessageChunk>(),
  }),
]);

export type TenantEvent = z.infer<typeof tenantEvent>;

export interface TenantActionDeleteBotParams {
  organizationId: string;
  botId: string;
}

export type TenantRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

export type TenantApprovalStatus = 'pending' | 'allowed' | 'denied' | 'expired' | 'cancelled';

export interface TenantRoomSummary extends DatabaseTenantRoom {
  botIds: string[];
  fresh: { botId: string; seq: number }[];
}

export interface TenantRoomLastMessage {
  authorName: string;
  text: string;
  createdAt: string;
}

export interface TenantRoomListItem extends TenantRoomSummary {
  lastMessage: TenantRoomLastMessage | null;
}

export interface TenantDaemon {
  harnessIds: string[];
  maxTurns: number;
  send: (message: DaemonServerMessage) => void;
  close: () => void;
}

export interface TenantSockets {
  broadcast: (event: TenantEvent) => void;
  daemon: () => TenantDaemon | undefined;
  closeDaemons: () => void;
  revoke: (tag: string) => boolean;
}

export interface TenantAlarm {
  set: (at: number) => void;
}

export interface TenantServicesDeps {
  database: { main: Database; tenant: DatabaseTenant };
  storage: StorageService;
  sockets: TenantSockets;
  alarm: TenantAlarm;
  enter: TenantCallsGate;
  exclusive: TenantCallsGate;
  waitUntil: (promise: Promise<void>) => void;
  env: EnvServer;
  organizationId: string;
}

export interface TenantTimeline {
  room: TenantRoomSummary;
  messages: RoomUIMessage[];
  runs: RunRoom[];
}

type TenantCall<T> = T extends (...args: infer P) => infer R ? (...args: P) => Promise<Awaited<R>> : never;

export interface TenantCalls {
  daemonHarnesses: TenantCall<HarnessService['queries']['list']>;
  daemonSkills: TenantCall<HarnessService['actions']['listSkills']>;
  daemonModels: TenantCall<HarnessService['actions']['listModels']>;
  memoryStatus: TenantCall<MemoryCaptureService['queries']['status']>;
  memoryControl: TenantCall<MemoryCaptureService['actions']['control']>;
  memoryList: TenantCall<MemoryStateService['queries']['list']>;
  memoryExport: TenantCall<MemoryStateService['queries']['export']>;
  memoryWipe: TenantCall<MemoryStateService['actions']['wipe']>;
  memoryMutate: TenantCall<MemoryStateService['actions']['mutate']>;
  roomList: TenantCall<RoomService['queries']['list']>;
  roomGet: TenantCall<RoomService['queries']['get']>;
  roomTimeline: TenantCall<RoomService['queries']['timeline']>;
  roomHistory: TenantCall<RoomService['queries']['history']>;
  roomReactions: TenantCall<RoomService['queries']['reactions']>;
  roomFile: TenantCall<RoomService['queries']['file']>;
  roomCreate: TenantCall<RoomService['actions']['create']>;
  roomOpenTeam: TenantCall<RoomService['actions']['openTeam']>;
  roomOpenDirect: TenantCall<RoomService['actions']['openDirect']>;
  roomReset: TenantCall<RoomService['actions']['reset']>;
  roomDelete: TenantCall<RoomService['actions']['delete']>;
  botDelete: TenantCall<RoomService['actions']['deleteBot']>;
  roomUpdate: TenantCall<RoomService['actions']['update']>;
  roomArrange: TenantCall<RoomService['actions']['arrange']>;
  roomSend: TenantCall<RoomService['actions']['send']>;
  roomAddFile: TenantCall<RoomService['actions']['addFile']>;
  roomRemoveFile: TenantCall<RoomService['actions']['removeFile']>;
  roomRerun: TenantCall<RoomService['actions']['rerun']>;
  roomAddReaction: TenantCall<RoomService['actions']['addReaction']>;
  roomRemoveReaction: TenantCall<RoomService['actions']['removeReaction']>;
  runStop: TenantCall<RunService['actions']['stop']>;
  runDrafts: TenantCall<RunService['queries']['drafts']>;
  runRetry: TenantCall<RunService['actions']['retry']>;
  runCancel: TenantCall<RunService['actions']['cancel']>;
  runApprove: TenantCall<RunService['actions']['approve']>;
  socketsClose: (params: TenantSocketsCloseParams) => Promise<void>;
}

export interface TenantDirectory {
  getByName: (organizationId: string) => TenantCalls;
}

export interface TenantServiceDeps {
  namespace: TenantDirectory;
  auth: Pick<AuthService, 'queries'>;
  bot: Pick<BotService, 'queries'>;
  storage: StorageService;
}

export interface TenantActionUploadFileParams {
  organizationId: string;
  roomId: string;
  file: File;
}

export interface TenantActionRemoveFileParams {
  organizationId: string;
  roomId: string;
  fileId: string;
}

export interface TenantQueryFileParams {
  request: Request;
}

export interface TenantRunDraft {
  runId: string;
  chunks: { id: number; chunk: UIMessageChunk }[];
}

export interface TenantQueryDraftsParams {
  organizationId: string;
  roomId: string;
}

export interface TenantQueryHarnessesParams {
  organizationId: string;
}

export interface TenantQueryModelsParams {
  organizationId: string;
  harnessId: string;
}

export interface TenantQuerySkillsParams {
  organizationId: string;
  botId: string;
}

export interface TenantQueryRoomsParams {
  organizationId: string;
}

export interface TenantQueryTimelineParams {
  organizationId: string;
  roomId: string;
}

export interface TenantQueryHistoryParams {
  organizationId: string;
  roomId: string;
  before: string;
}

export interface TenantActionSocketAuthorizeParams {
  request: Request;
}

export type TenantSocketAuthorization =
  | { ok: true; organizationId: string; ownerTag: string }
  | { ok: false; status: 401 | 403 };

export interface TenantSocketOwner {
  kind: 'session' | 'key';
  id: string;
}

export interface TenantActionDisconnectParams {
  organizationId: string;
  owner: TenantSocketOwner;
}

export interface TenantSocketsCloseParams {
  tag: string;
}

export interface TenantActionArrangeRoomsParams {
  organizationId: string;
  pinned: string[];
  placed: string[];
}

export interface TenantActionUpdateRoomParams {
  organizationId: string;
  roomId: string;
  name?: string;
  botIds?: string[];
  description?: string;
  driver?: RouteDriverName | null;
  sendMode?: RoomInputSendMode;
}

export interface TenantActionCreateRoomParams {
  organizationId: string;
  name: string;
  botIds: string[];
  description: string;
  driver: RouteDriverName | null;
  sendMode: RoomInputSendMode;
}

export type TenantActionOpenTeamParams = Omit<TenantActionCreateRoomParams, 'description' | 'driver' | 'sendMode'>;

export interface TenantActionOpenDirectParams {
  organizationId: string;
  botId: string;
}

export interface TenantActionDeleteRoomParams {
  organizationId: string;
  roomId: string;
}

export interface TenantActionResetParams {
  organizationId: string;
  roomId: string;
  botIds: string[];
}

export interface TenantActionSendParams {
  organizationId: string;
  userId: string;
  userName: string;
  roomId: string;
  messageId?: string;
  text: string;
  fileIds: string[];
  replyToMessageId?: string;
}

export interface TenantActionRerunParams {
  organizationId: string;
  userId: string;
  userName: string;
  roomId: string;
}

export interface TenantActionAddReactionParams {
  organizationId: string;
  userId: string;
  userName: string;
  roomId: string;
  messageId: string;
  reactionId: string;
  emoji: string;
}

export interface TenantActionRemoveReactionParams {
  organizationId: string;
  userId: string;
  roomId: string;
  reactionId: string;
}

export interface TenantQueryReactionsParams {
  organizationId: string;
  userId: string;
  roomId: string;
  fromSeq: number;
}

export interface TenantActionStopParams {
  organizationId: string;
  roomId: string;
}

export interface TenantActionRetryParams {
  organizationId: string;
  roomId: string;
  runId: string;
}

export interface TenantActionApproveParams {
  organizationId: string;
  userName: string;
  approvalId: string;
  approved: boolean;
}

export interface TenantActionCancelParams {
  organizationId: string;
  roomId: string;
  runId: string;
}

export interface TenantServices {
  memory: MemoryService;
  memoryCapture: MemoryCaptureService;
  memoryState: MemoryStateService;
  mcpInternal: McpInternalService;
  database: TenantServicesDeps['database'];
  sockets: TenantSockets;
  alarm: TenantAlarm;
  harness: HarnessService;
  bots: BotService;
  storage: StorageService;
  jev: TypeSafeClient;
  organization: OrganizationService;
  judgeRequests: RouteJudgeRequests;
  drivers: RouteDrivers;
  route: RouteService;
  run: RunService;
  room: RoomService;
  calls: TenantCallsService;
}

export interface TenantQueryMemoryListParams extends MemoryStateTypes.MemoryStateQueryListParams {
  organizationId: string;
}

export interface TenantQueryMemoryExportParams extends MemoryStateTypes.MemoryStateQueryExportParams {
  organizationId: string;
}

export interface TenantActionMemoryMutateParams extends MemoryStateTypes.MemoryStateActionMutateParams {
  organizationId: string;
}

export interface TenantQueryMemoryStatusParams extends MemoryCaptureTypes.MemoryCaptureQueryStatusParams {
  organizationId: string;
}

export interface TenantActionMemoryControlParams extends MemoryCaptureTypes.MemoryCaptureControlInput {
  organizationId: string;
}

export interface TenantActionMemoryWipeParams extends MemoryWipeInput {
  organizationId: string;
}
