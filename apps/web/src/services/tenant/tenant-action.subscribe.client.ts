import { TENANT, tenantEvent } from '@orbs/server/client';
import type { TenantListener, TenantState, TenantUnsubscribe } from '@/types/tenant.types';

export function tenantActionSubscribe(state: TenantState, listener: TenantListener): TenantUnsubscribe {
  function tenantOpen() {
    if (state.socket || state.listeners.size === 0) {
      return;
    }

    const socket = new WebSocket(`${location.origin.replace(/^http/, 'ws')}${TENANT.browserSocketPath}`);
    state.socket = socket;
    socket.addEventListener('message', (message) => {
      const event = tenantEvent.safeParse(JSON.parse(String(message.data)));

      if (!event.success) {
        return;
      }

      if (event.data.type === 'room.deleted') {
        state.chats.delete(event.data.roomId);
      }

      for (const subscriber of state.listeners) {
        subscriber(event.data);
      }
    });
    socket.addEventListener('close', (event) => {
      if (state.socket !== socket) {
        return;
      }

      state.socket = undefined;

      if (event.code === TENANT.revokedCloseCode) {
        return;
      }

      state.retry = setTimeout(tenantOpen, TENANT.reconnectDelayMs);
    });
  }

  state.listeners.add(listener);
  tenantOpen();

  return () => {
    state.listeners.delete(listener);

    if (state.listeners.size > 0) {
      return;
    }

    clearTimeout(state.retry);
    const socket = state.socket;
    state.socket = undefined;
    socket?.close();
  };
}
