import { join } from 'node:path';
import { mcpQueryConfig } from './mcp-query.config';
import { mcpQuerySettings } from './mcp-query.settings';
import type { McpBotParams, McpServiceDeps } from '../../types/mcp.types';
import type { McpShared } from '@repo/contracts/universal';

export async function mcpQueryShared(deps: McpServiceDeps, { bot }: McpBotParams): Promise<McpShared> {
  const settings = await mcpQuerySettings(deps);

  const config = await mcpQueryConfig(deps, {
    botId: bot.id,
    paths: settings.paths,
    isInherited: true,
    sharedMcp: null,
  });

  return config.servers
    .filter((entry) => !entry.isBotLocal && !entry.source.endsWith(join('mcp', `${bot.id}.json`)))
    .map((entry) => ({ name: entry.name, source: entry.source }));
}
