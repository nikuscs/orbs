import { z } from 'zod';
import { botThinkingLevel } from '#/types/bot.types';
import type { Bot } from '#/types/bot.types';
import type { DaemonJudgedMessage, DaemonJudgeMessage } from '#/types/daemon.types';
import type { DatabaseTenant } from '#/types/database-tenant.types';
import type { OrganizationSettings } from '#/types/organization.types';
import type { RoomMessageRoute } from '#/types/room.types';
import type { TenantSockets } from '#/types/tenant.types';
import type { BotService } from '#services/bot/bot.service';
import type { OrganizationService } from '#services/organization/organization.service';
import type { RouteDriverName } from './route-driver.types';
import type { TypeSafeClient } from '@typesafe-ai/sdk';

export interface RouteMessage {
  id: string;
  roomId: string;
  role: 'user' | 'assistant';
  authorId: string;
  authorName: string;
  text: string;
  hop: number;
  reactionAuthorId: string | null;
  replyAuthorId: string | null;
}

export const routeJudgeModel = z.object({
  harnessId: z.string().min(1),
  modelProvider: z.string().min(1),
  modelId: z.string().min(1),
  thinkingLevel: botThinkingLevel,
});

export type RouteJudgeModel = z.infer<typeof routeJudgeModel>;

export type RouteSeat = 'required' | 'optional' | 'backstop';

export interface RouteResponder {
  bot: Bot;
  seat: RouteSeat;
}

export interface RouteDecideParams {
  message: RouteMessage;
  members: Bot[];
  candidates: Bot[];
  mentioned: Bot[];
  quoted: Bot[];
  leader: Bot | undefined;
  judge: RouteJudgeModel | null;
}

export interface RouteDecision {
  responders: RouteResponder[];
  route: RoomMessageRoute;
}

export interface RouteDriver {
  decide: (params: RouteDecideParams) => Promise<RouteDecision>;
}

export type RouteDrivers = Record<RouteDriverName, RouteDriver>;

export interface RouteDriversServiceDeps {
  database: DatabaseTenant;
  jev: TypeSafeClient;
  sockets: TenantSockets;
  requests: RouteJudgeRequests;
}

export interface RouteDriverRoundtableDeps {
  database: DatabaseTenant;
}

export interface RouteDriverJevDeps {
  database: DatabaseTenant;
  jev: TypeSafeClient;
}

export type RouteJudgeRequest = Omit<DaemonJudgeMessage, 'type' | 'requestId'>;

export type RouteJudgeAnswer = Omit<DaemonJudgedMessage, 'type' | 'requestId'>;

export interface RouteJudgeDecided {
  picked: Bot[];
  resume: string;
}

export type RouteJudgeRequests = Map<string, (answer: RouteJudgeAnswer) => void>;

export interface RouteDriverJudgeDeps {
  database: DatabaseTenant;
  sockets: TenantSockets;
  requests: RouteJudgeRequests;
  fallback: RouteDriver;
}

export type RouteActionJudgedParams = Omit<DaemonJudgedMessage, 'type'>;

export interface RoutePlan extends RouteDecision {
  members: Bot[];
}

export type RouteSettings = OrganizationSettings['routing'];

export interface RouteCache {
  bots: Bot[];
  settings: OrganizationSettings;
  loadedAt: number;
}

export interface RouteServiceDeps {
  database: DatabaseTenant;
  bot: Pick<BotService, 'queries'>;
  organization: Pick<OrganizationService, 'queries'>;
  jev: TypeSafeClient;
  drivers: RouteDrivers;
  judgeRequests: RouteJudgeRequests;
  organizationId: string;
  cache: RouteCache;
}

export interface RouteQueryPlanParams extends RouteMessage {
  images: boolean;
}

export interface RouteQuerySeeingParams {
  bots: Bot[];
}

export interface RouteQueryBlindParams {
  roomId: string;
  text: string;
}

export interface RouteQueryMemoryParams { prompt: string }

export interface RouteQueryApprovalParams {
  roomId: string;
  botName: string;
  instructions: string;
  toolName: string;
  input: string;
}

export interface RouteVerdictScores<T> {
  candidates: T[];
  fit: (bot: T) => number;
  group: number;
  asker: T | undefined;
  answers: number;
  expects: number;
  unowned: number;
}

export interface RouteVerdict<T> {
  via: 'jev' | 'lead' | 'none';
  responders: T[];
  score: (bot: T) => number;
}

export interface RouteApprovalState {
  bot: { name: string; scope: string };
  call: { tool: string; input: string };
  request?: { author: string; text: string };
}

export interface RouteJevState {
  members: { name: string; scope: string }[];
  recent: { author: string; from: string; replyingTo: string | null; text: string }[];
  latest: { author: string; from: string; text: string };
  room?: { description: string };
  request?: { author: string; text: string };
}
