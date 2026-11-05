import { mcpActionAdd } from './mcp-action.add';
import { mcpActionConfigure } from './mcp-action.configure';
import { mcpActionPrepare } from './mcp-action.prepare';
import { mcpActionRelease } from './mcp-action.release';
import { mcpActionRemove } from './mcp-action.remove';
import { mcpQueryDiscover } from './mcp-query.discover';
import { mcpQuerySettings } from './mcp-query.settings';
import { mcpQueryShared } from './mcp-query.shared';
import { mcpQueryTarget } from './mcp-query.target';
import type * as McpTypes from '../../types/mcp.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeMcpService(deps: McpTypes.McpServiceDeps) {
  return {
    actions: {
      configure: (params: UniversalTypes.McpConfigureInput) => mcpActionConfigure(deps, params),
      prepare: (params: McpTypes.McpPrepareParams) => mcpActionPrepare(deps, params),
      add: (params: UniversalTypes.McpServerAddInput) => mcpActionAdd(deps, params),
      remove: (params: UniversalTypes.McpServerRemoveInput) => mcpActionRemove(deps, params),
      release: (params: UniversalTypes.BotGetInput) => mcpActionRelease(deps, params),
    },
    queries: {
      settings: () => mcpQuerySettings(deps),
      discover: (params: McpTypes.McpBotParams) => mcpQueryDiscover(deps, params),
      shared: (params: McpTypes.McpBotParams) => mcpQueryShared(deps, params),
      target: (params: McpTypes.McpTargetParams) => mcpQueryTarget(deps, params),
    },
  };
}

export type McpService = ReturnType<typeof makeMcpService>;
