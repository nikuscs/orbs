import { mcpInternalActionCall } from './mcp-internal-action.call';
import type { McpInternalActionCallParams, McpInternalServiceDeps } from '#/types/mcp-internal-service.types';

export function makeMcpInternalService(deps: McpInternalServiceDeps) {
  return { actions: { call: (params: McpInternalActionCallParams) => mcpInternalActionCall(deps, params) } };
}

export type McpInternalService = ReturnType<typeof makeMcpInternalService>;
