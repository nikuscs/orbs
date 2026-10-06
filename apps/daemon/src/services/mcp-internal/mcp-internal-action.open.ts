import { createHmac } from 'node:crypto';
import { mcpInternalActionHandle } from './mcp-internal-action.handle';
import { MCP_INTERNAL_DAEMON } from './mcp-internal.constants';
import type { McpInternalConnection, McpInternalRun, McpInternalServiceDeps } from '#/types/mcp-internal.types';

export function mcpInternalActionOpen(deps: McpInternalServiceDeps, run: McpInternalRun): McpInternalConnection {
  deps.state.server ??= Bun.serve({
    hostname: MCP_INTERNAL_DAEMON.hostname,
    port: 0,
    maxRequestBodySize: MCP_INTERNAL_DAEMON.maxRequestBodySize,
    fetch: (request) => mcpInternalActionHandle(deps, request),
  });

  const token = createHmac('sha256', deps.state.secret).update(JSON.stringify([run.roomId, run.botId])).digest('base64url');
  deps.state.runs.set(token, run);

  return {
    url: `http://${MCP_INTERNAL_DAEMON.hostname}:${deps.state.server.port}${MCP_INTERNAL_DAEMON.path}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}
