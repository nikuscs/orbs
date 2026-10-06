import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { MCP_INTERNAL, mcpInternalCall } from '@orbs/server/daemon';
import { mcpInternalActionCall } from './mcp-internal-action.call';
import { MCP_INTERNAL_DAEMON } from './mcp-internal.constants';
import type { McpInternalServiceDeps } from '#/types/mcp-internal.types';
import type { CallToolResult } from '@modelcontextprotocol/server';
import type { McpInternalCall } from '@orbs/server/daemon';

export async function mcpInternalActionHandle(deps: McpInternalServiceDeps, request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname !== MCP_INTERNAL_DAEMON.path || url.hostname !== MCP_INTERNAL_DAEMON.hostname) {
    return new Response(null, { status: 404 });
  }

  if (request.headers.has('origin')) {
    return new Response(null, { status: 403 });
  }

  const authorization = request.headers.get('authorization');
  const run = authorization?.startsWith('Bearer ') ? deps.state.runs.get(authorization.slice(7)) : undefined;

  if (!run) {
    return new Response(null, { status: 401 });
  }

  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: MCP_INTERNAL.name, version: MCP_INTERNAL.version });

    for (const schema of mcpInternalCall.options) {
      const name = schema.shape.name.value;
      const readOnly = MCP_INTERNAL.readTools.some((tool) => tool === name);

      if (run.permission === 'read-only' && !readOnly) {
        continue;
      }

      server.registerTool<typeof schema.shape.input, typeof schema.shape.input>(name, {
        description: MCP_INTERNAL.descriptions[name],
        inputSchema: schema.shape.input,
        annotations: { readOnlyHint: readOnly, destructiveHint: name.endsWith('_delete'), openWorldHint: false },
      }, async (input: McpInternalCall['input']): Promise<CallToolResult> => {
        const call = mcpInternalCall.parse({ name, input });

        const result = await mcpInternalActionCall(deps, {
          run,
          call,
          signal: request.signal,
        });

        return { content: [{ type: 'text', text: result.text }], isError: result.isError };
      });
    }

    return server;
  });

  return handler.fetch(request);
}
