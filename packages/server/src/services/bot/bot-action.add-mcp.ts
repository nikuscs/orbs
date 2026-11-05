import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { botActionConnectMcp } from './bot-action.connect-mcp';
import type { BotServiceDeps } from '../../types/bot.types';
import type { McpServerAddInput } from '@repo/contracts/universal';

export async function botActionAddMcp(deps: BotServiceDeps, params: McpServerAddInput) {
  await deps.mcp.actions.add(params);
  const catalog = await botActionConnectMcp(deps, { botId: params.botId });

  return match(catalog.servers.find((server) => server.name === params.name))
    .with(P.nonNullable, (server) => server)
    .otherwise(() => {
      throw new Errors.NOT_FOUND({ resource: 'mcp server', resourceId: params.name });
    });
}
