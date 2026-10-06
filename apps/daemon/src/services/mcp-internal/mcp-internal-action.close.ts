import { MCP_INTERNAL_DAEMON } from './mcp-internal.constants';
import type { McpInternalActionCloseParams, McpInternalServiceDeps } from '#/types/mcp-internal.types';

export function mcpInternalActionClose(deps: McpInternalServiceDeps, { runId }: McpInternalActionCloseParams): void {
  for (const [token, run] of deps.state.runs) {
    if (runId === undefined || run.runId === runId) {
      deps.state.runs.delete(token);
    }
  }

  for (const pending of deps.state.pending.values()) {
    if (runId === undefined || pending.runId === runId) {
      pending.resolve(MCP_INTERNAL_DAEMON.unavailable);
    }
  }
}
