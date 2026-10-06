import type { ConnectionServiceDeps } from '#/types/connection.types';
import type { DaemonClientMessage } from '@orbs/server/daemon';

export function connectionActionSend(deps: ConnectionServiceDeps, params: DaemonClientMessage): void {
  if (deps.socket.current?.readyState !== WebSocket.OPEN) {
    return;
  }

  deps.socket.current.send(JSON.stringify(params));
}
