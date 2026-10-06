import type { BotPermission, BotThinkingLevel } from '#/types/bot.types';
import type { RoomInputSendMode } from '#/types/room-input.types';
import type { RouteDriverName } from '#/types/route-driver.types';
import type { RouteSeat } from '#/types/route.types';
import type * as TenantTypes from '#/types/tenant.types';
import type * as KyselyTypes from 'kysely';

export interface DatabaseTenantRoomTable {
  id: string;
  kind: TenantTypes.TenantRoomKind;
  name: string;
  memberKey: string;
  leaderBotId: string | null;
  description: KyselyTypes.Generated<string>;
  stoppedThrough: number | null;
  pinned: KyselyTypes.Generated<number>;
  position: number | null;
  driver: RouteDriverName | null;
  sendMode: KyselyTypes.Generated<RoomInputSendMode>;
  rotation: KyselyTypes.Generated<number>;
  createdAt: string;
}

export interface DatabaseTenantMemberTable {
  roomId: string;
  botId: string;
  freshFrom: KyselyTypes.Generated<number>;
  createdAt: string;
}

export interface DatabaseTenantMessageTable {
  id: string;
  roomId: string;
  seq: number;
  role: 'user' | 'assistant';
  authorId: string;
  authorName: string;
  runId: string | null;
  parts: string;
  route: string | null;
  usage: string | null;
  replyTo: string | null;
  rerunOf: string | null;
  triggerId: string | null;
  reactionId: string | null;
  createdAt: string;
}

export interface DatabaseTenantReactionTable {
  id: string;
  roomId: string;
  targetId: string;
  authorId: string;
  authorName: string;
  emoji: string;
  deliverAt: number;
  removedAt: string | null;
  createdAt: string;
}

export interface DatabaseTenantRunTable {
  id: string;
  roomId: string;
  botId: string;
  botName: string;
  homeDir: string;
  harnessId: string;
  modelProvider: string;
  modelId: string;
  thinkingLevel: BotThinkingLevel;
  permission: BotPermission;
  instructions: string;
  roomInstructions: string;
  inherit: string;
  hop: number;
  triggerMessageId: string | null;
  contextThrough: number | null;
  acceptedAt: string | null;
  status: TenantTypes.TenantRunStatus;
  failure: string | null;
  activity: TenantTypes.TenantRunActivity;
  activeTools: number;
  waitedMs: KyselyTypes.Generated<number>;
  seat: RouteSeat;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTenantApprovalTable {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  input: string;
  status: TenantTypes.TenantApprovalStatus;
  answeredBy: string | null;
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTenantBindingTable {
  roomId: string;
  botId: string;
  harnessId: string;
  resume: string;
  contextThrough: number;
  updatedAt: string;
}

export interface DatabaseTenantJudgeTable {
  roomId: string;
  harnessId: string;
  resume: string;
  contextThrough: number;
  updatedAt: string;
}

export interface DatabaseTenantChunkTable {
  id: KyselyTypes.Generated<number>;
  runId: string;
  body: string;
}

export interface DatabaseTenantHarnessTable {
  id: string;
  catalogue: string;
  updatedAt: string;
}

export interface DatabaseTenantFileTable {
  id: string;
  roomId: string;
  messageId: string | null;
  name: string;
  mediaType: string;
  size: number;
  createdAt: string;
}

export interface DatabaseTenantRoutingTable {
  messageId: string;
  dueAt: number;
}

export interface DatabaseTenantMemorySnapshotTable {
  scope: 'global' | 'bot' | 'room';
  ownerId: string;
  text: string;
  dirty: number;
  dueAt: number;
}

export interface DatabaseTenantMemoryRoomTable {
  captureFacts: KyselyTypes.Generated<number>;
  roomId: string;
  enabled: number;
  generation: string;
  cursor: number;
  throughSeq: number;
  fromSeq: number;
  offset: number;
  status: 'idle' | 'pending' | 'running' | 'applying' | 'paused';
  dueAt: number | null;
  attempt: number;
  requestId: string | null;
  model: string | null;
  source: string | null;
  result: string | null;
  error: string | null;
  recap: string;
  recapFrom: number;
  recapThrough: number;
  recapRevision: number;
  baseRecapRevision: number;
  usage: string | null;
  skipped: string;
}

export interface DatabaseTenantSchema {
  memorySnapshot: DatabaseTenantMemorySnapshotTable;
  memoryRoom: DatabaseTenantMemoryRoomTable;
  approval: DatabaseTenantApprovalTable;
  chunk: DatabaseTenantChunkTable;
  file: DatabaseTenantFileTable;
  harness: DatabaseTenantHarnessTable;
  judge: DatabaseTenantJudgeTable;
  room: DatabaseTenantRoomTable;
  member: DatabaseTenantMemberTable;
  message: DatabaseTenantMessageTable;
  reaction: DatabaseTenantReactionTable;
  routing: DatabaseTenantRoutingTable;
  run: DatabaseTenantRunTable;
  binding: DatabaseTenantBindingTable;
}

export type DatabaseTenantRoom = KyselyTypes.Selectable<DatabaseTenantRoomTable>;

export type DatabaseTenantMessage = KyselyTypes.Selectable<DatabaseTenantMessageTable>;

export type DatabaseTenantRun = KyselyTypes.Selectable<DatabaseTenantRunTable>;

export type DatabaseTenantApproval = KyselyTypes.Selectable<DatabaseTenantApprovalTable>;

export type DatabaseTenantFile = KyselyTypes.Selectable<DatabaseTenantFileTable>;

export type DatabaseTenantValue = ArrayBuffer | string | number | null;

export interface DatabaseTenant {
  db: KyselyTypes.Kysely<DatabaseTenantSchema>;
  all: <O extends Record<string, DatabaseTenantValue>>(query: KyselyTypes.Compilable<O>) => O[];
  run: (query: KyselyTypes.Compilable) => void;
  transaction: <T>(operation: () => T) => T;
}

export interface DatabaseTenantDurable extends DatabaseTenant {
  migrate: () => void;
}
