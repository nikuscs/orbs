import { connectionActionClose } from './connection-action.close';
import { connectionActionOpen } from './connection-action.open';
import { connectionActionSend } from './connection-action.send';
import type { ConnectionActionOpenParams, ConnectionServiceDeps } from '#/types/connection.types';
import type { DaemonClientMessage } from '@orbs/server/daemon';

export function makeConnectionService(deps: ConnectionServiceDeps) {
  return {
    actions: {
      open: (params: ConnectionActionOpenParams) => connectionActionOpen(deps, params),
      close: () => connectionActionClose(deps),
      send: (params: DaemonClientMessage) => connectionActionSend(deps, params),
    },
  };
}

export type ConnectionService = ReturnType<typeof makeConnectionService>;
