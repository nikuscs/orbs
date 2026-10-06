import type { HarnessService } from '#services/harness/harness.service';
import type { EnvDaemon } from '@orbs/env/daemon';
import type { DaemonServerMessage } from '@orbs/server/daemon';

export interface ConnectionSocket {
  current: WebSocket | undefined;
  closed: boolean;
}

export interface ConnectionServiceDeps {
  env: EnvDaemon;
  harness: Pick<HarnessService, 'queries'>;
  socket: ConnectionSocket;
}

export interface ConnectionActionOpenParams {
  onMessage: (message: DaemonServerMessage) => void;
  onClose: () => void;
}

