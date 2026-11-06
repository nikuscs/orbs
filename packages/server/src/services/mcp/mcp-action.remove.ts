import { Errors } from '@repo/errors/universal';
import { match } from 'ts-pattern';
import { mcpFilesDerivedClear, mcpFilesRead, mcpFilesWrite } from './mcp-files.utils';
import type { McpServiceDeps } from '../../types/mcp.types';
import type { McpServerRemoveInput } from '@repo/contracts/universal';

export async function mcpActionRemove(deps: McpServiceDeps, { botId, name }: McpServerRemoveInput) {
  const document = await mcpFilesRead(deps, botId);

  await match(Object.hasOwn(document.mcpServers, name))
    .with(false, () => {
      throw new Errors.NOT_FOUND({ resource: 'mcp server', resourceId: name });
    })
    .with(true, async () => {
      const mcpServers = Object.fromEntries(Object.entries(document.mcpServers).filter(([key]) => key !== name));
      await mcpFilesWrite(deps, botId, { mcpServers });
      await mcpFilesDerivedClear(deps, botId, name);
    })
    .exhaustive();
}
