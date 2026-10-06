import { MCP_INTERNAL_DAEMON } from './mcp-internal.constants';
import type { McpInternalActionCallParams, McpInternalServiceDeps } from '#/types/mcp-internal.types';
import type { McpInternalResult } from '@orbs/server/daemon';

export async function mcpInternalActionCall(deps: McpInternalServiceDeps, params: McpInternalActionCallParams): Promise<McpInternalResult> {
  if (params.signal.aborted || ![...deps.state.runs.values()].some((run) => run.runId === params.run.runId)) {
    return MCP_INTERNAL_DAEMON.unavailable;
  }

  const requestId = crypto.randomUUID();
  const mcpInternalAborted = () => deps.state.pending.get(requestId)?.resolve(MCP_INTERNAL_DAEMON.unavailable);

  try {
    return await new Promise<McpInternalResult>((resolve) => {
      const timer = setTimeout(() => resolve({ text: 'REQUEST_TIMEOUT', isError: true }), MCP_INTERNAL_DAEMON.requestTimeoutMs);
      deps.state.pending.set(requestId, {
        runId: params.run.runId,
        resolve,
        timer,
      });
      params.signal.addEventListener('abort', mcpInternalAborted, { once: true });
      deps.connection.actions.send({
        type: 'mcp-internal.call',
        runId: params.run.runId,
        requestId,
        call: params.call,
      });
    });
  } finally {
    clearTimeout(deps.state.pending.get(requestId)?.timer);
    deps.state.pending.delete(requestId);
    params.signal.removeEventListener('abort', mcpInternalAborted);
  }
}
