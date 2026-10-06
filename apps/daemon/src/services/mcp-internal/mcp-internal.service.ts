import { mcpInternalActionClose } from './mcp-internal-action.close';
import { mcpInternalActionOpen } from './mcp-internal-action.open';
import type { McpInternalRun, McpInternalServiceDeps } from '#/types/mcp-internal.types';
import type { DaemonMcpResultMessage } from '@orbs/server/daemon';

export function makeMcpInternalService(deps: McpInternalServiceDeps) {
  return {
    actions: {
      open: (params: McpInternalRun) => mcpInternalActionOpen(deps, params),
      close: (runId?: string) => mcpInternalActionClose(deps, { runId }),
      answer: (params: DaemonMcpResultMessage) => deps.state.pending.get(params.requestId)?.resolve(params),
      dispose: () => {
        mcpInternalActionClose(deps, {});
        void deps.state.server?.stop(true);
        deps.state.server = undefined;
      },
    },
  };
}

export type McpInternalService = ReturnType<typeof makeMcpInternalService>;
