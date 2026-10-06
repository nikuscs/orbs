import { Chat } from '@ai-sdk/react';
import { createIsomorphicFn } from '@tanstack/react-start';
import { tenantActionSubscribe } from './tenant-action.subscribe.client';
import { tenantActionSync } from './tenant-action.sync.client';
import { tenantActionWatchDrafts } from './tenant-action.watch-drafts.client';
import { tenantQueryTransport } from './tenant-query.transport.client';
import type { TenantDraftListener, TenantListener, TenantState } from '@/types/tenant.types';
import type { RoomUIMessage } from '@orbs/server/client';
import type { QueryClient } from '@tanstack/react-query';

export function tenantActionCreate() {
  const state: TenantState = { listeners: new Set(), chats: new Map(), socket: undefined, retry: undefined };
  const tenantSubscribe = (listener: TenantListener) => tenantActionSubscribe(state, listener);

  const tenantRoomChat = createIsomorphicFn()
    .server((roomId: string, messages: RoomUIMessage[]) => new Chat<RoomUIMessage>({
      id: roomId,
      messages,
      transport: tenantQueryTransport({ roomId }),
    }))
    .client((roomId: string, messages: RoomUIMessage[]) => {
      const existing = state.chats.get(roomId);

      if (existing) {
        return existing;
      }

      const chat = new Chat<RoomUIMessage>({
        id: roomId,
        messages,
        transport: tenantQueryTransport({ roomId }),
      });

      state.chats.set(roomId, chat);

      return chat;
    });

  return {
    subscribe: tenantSubscribe,
    watchDrafts: (roomId: string, onDraft: TenantDraftListener) => tenantActionWatchDrafts(state, { roomId, onDraft }),
    roomChat: tenantRoomChat,
    sync: (queryClient: QueryClient) => tenantActionSync(queryClient, tenantSubscribe),
  };
}
