import type { ConnectionService } from '#services/connection/connection.service';
import type { DaemonStartMessage, McpInternalCall, McpInternalResult } from '@orbs/server/daemon';

export type McpInternalRun = Pick<DaemonStartMessage, 'runId' | 'roomId' | 'botId' | 'permission'>;

export interface McpInternalConnection {
  url: string;
  headers: { Authorization: string };
}

export interface McpInternalPending {
  runId: string;
  resolve: (result: McpInternalResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface McpInternalState {
  server: ReturnType<typeof Bun.serve> | undefined;
  secret: string;
  runs: Map<string, McpInternalRun>;
  pending: Map<string, McpInternalPending>;
}

export interface McpInternalServiceDeps {
  connection: Pick<ConnectionService, 'actions'>;
  state: McpInternalState;
}

export interface McpInternalActionCallParams {
  run: McpInternalRun;
  call: McpInternalCall;
  signal: AbortSignal;
}

export interface McpInternalActionCloseParams {
  runId?: string;
}
