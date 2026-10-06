import type { Chat } from '@ai-sdk/react';
import type * as ClientTypes from '@orbs/server/client';

export type TenantListener = (event: ClientTypes.TenantEvent) => void;

export type TenantSubscribe = (listener: TenantListener) => TenantUnsubscribe;

export interface TenantState {
  listeners: Set<TenantListener>;
  chats: Map<string, Chat<ClientTypes.RoomUIMessage>>;
  socket: WebSocket | undefined;
  retry: ReturnType<typeof setTimeout> | undefined;
}

export type TenantTransportParams = Pick<TenantWatchDraftsParams, 'roomId'>;

export interface TenantWatchDraftsParams {
  roomId: string;
  onDraft: TenantDraftListener;
}

export type TenantTimelineEvent = Extract<ClientTypes.TenantEvent, { type: 'message.created' | 'message.routed' | 'run.updated' | 'run.activity' }>;

export type TenantTimelinePatch = (timeline: ClientTypes.TenantTimeline) => ClientTypes.TenantTimeline;

export type TenantRunChunk = Omit<Extract<ClientTypes.TenantEvent, { type: 'run.chunk' }>, 'type' | 'roomId'>;

export interface TenantRoomTitle {
  title: string;
  subtitle: string | null;
}

export type TenantUnsubscribe = () => void;

export type TenantDraftListener = (runId: string, draft: ClientTypes.RoomUIMessage) => void;

export type TenantCacheUpdate = () => void;

export type TenantMessageCreated = Extract<TenantTimelineEvent, { type: 'message.created' }>;

export interface TenantMergeTimelineParams {
  current: ClientTypes.RoomUIMessage[];
  latest: ClientTypes.RoomUIMessage[];
}

export interface TenantRoomTitleParams {
  room: ClientTypes.TenantRoomSummary;
  members: ClientTypes.Bot[];
}

export interface TenantFreshAnchorsParams {
  messages: ClientTypes.RoomUIMessage[];
  fresh: ClientTypes.TenantRoomSummary['fresh'];
}

export interface TenantMergeOlderParams {
  older: ClientTypes.RoomUIMessage[];
  current: ClientTypes.RoomUIMessage[];
}
