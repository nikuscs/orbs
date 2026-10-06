import { z } from 'zod';
import type * as DaemonTypes from '#/types/daemon.types';
import type { DatabaseTenant, DatabaseTenantMessage, DatabaseTenantRun } from '#/types/database-tenant.types';
import type { RoutePlan } from '#/types/route.types';
import type { TenantAlarm, TenantSockets } from '#/types/tenant.types';
import type { RouteService } from '#services/route/route.service';

export const runToolOutput = z.string();

export const runStopInput = z.object({
  roomId: z.string().min(1),
});

export const runRetryInput = z.object({
  roomId: z.string().min(1),
  runId: z.string().min(1),
});

export const runCancelInput = z.object({
  roomId: z.string().min(1),
  runId: z.string().min(1),
});

export const runApproveInput = z.object({
  approvalId: z.string().min(1),
  approved: z.boolean(),
});

export interface RunQueryGetParams {
  runId: string;
}

export interface RunQueryDraftsParams {
  roomId: string;
}

export interface RunDraftChunk {
  id: number;
  body: string;
}

export interface RunDraft {
  runId: string;
  chunks: RunDraftChunk[];
}

export interface RunQueryRoomParams {
  roomId: string;
}

export interface RunActionAnnounceParams {
  roomId: string;
}

export interface RunQueryRetryableParams {
  roomId: string;
}

export interface RunServiceDeps {
  database: DatabaseTenant;
  sockets: TenantSockets;
  alarm: TenantAlarm;
  route: Pick<RouteService, 'queries'>;
  routing: Set<string>;
}

export interface RunPromptTurn {
  hop: number;
  seat: 'required' | 'optional';
  backstop: boolean;
  alsoAsked: string[];
  answered: string[];
  team: boolean;
  skills: string[];
}

export interface RunPromptMessage extends Pick<DatabaseTenantMessage, 'roomId' | 'authorName' | 'parts' | 'replyTo' | 'rerunOf'> {
  reactionEmoji: string | null;
  reactionRemovedAt: string | null;
}

export interface RunActionRouteParams {
  messageId: string;
}

export interface RunActionQueueParams {
  roomId: string;
  plan: RoutePlan;
  hop: number;
  triggerMessageId: string;
}

export type RunActionAcceptParams = Omit<DaemonTypes.DaemonAcceptedMessage, 'type'>;

export type RunActionChunkParams = Omit<DaemonTypes.DaemonChunkMessage, 'type'>;

export type RunActionEndParams = Omit<DaemonTypes.DaemonEndMessage, 'type'>;

export type RunActionApprovalParams = Omit<DaemonTypes.DaemonApprovalMessage, 'type'>;

export interface RunActionApproveParams {
  approvalId: string;
  approved: boolean;
  userName: string;
}

export type RunApprovalAnswer = 'allowed' | 'denied' | 'expired';

export interface RunActionStopParams {
  roomId: string;
}

export interface RunActionRetryParams {
  roomId: string;
  runId: string;
}

export interface RunActionSupersedeParams {
  roomId: string;
  seq: number;
}

export interface RunActionCancelParams {
  roomId: string;
  runId: string;
}

export interface RunActionRemoveBotParams {
  botId: string;
}

export interface RunActionSteerParams {
  message: DatabaseTenantMessage;
}

export type RunArrivedMessage = Pick<DatabaseTenantMessage, 'id' | 'roomId' | 'seq' | 'authorId' | 'authorName' | 'parts' | 'route'>;

export type RunRoomRow = Pick<DatabaseTenantRun, 'id' | 'roomId' | 'botId' | 'botName' | 'status' | 'failure' | 'activity' | 'seat'>;

export interface RunRoom extends Pick<DatabaseTenantRun, 'id' | 'roomId' | 'botId' | 'botName' | 'status' | 'activity' | 'seat'> {
  failure: DaemonTypes.DaemonRunFailure | null;
}

export interface RunActionMemoryParams {
  botId: string;
  roomId: string;
}
