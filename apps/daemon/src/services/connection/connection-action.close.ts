import { TENANT } from '@orbs/server/daemon';
import type { ConnectionServiceDeps } from '#/types/connection.types';

export function connectionActionClose(deps: ConnectionServiceDeps): void {
  deps.socket.closed = true;
  deps.socket.current?.close(TENANT.shutdownCloseCode, 'daemon shutdown');
}
