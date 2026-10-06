import { botFromRow } from './bot.utils';
import type { Bot, BotQueryGetParams, BotServiceDeps } from '#/types/bot.types';

export async function botQueryGet(deps: BotServiceDeps, params: BotQueryGetParams): Promise<Bot | undefined> {
  const result = await deps.database.db
    .selectFrom('bot')
    .selectAll()
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.botId)
    .executeTakeFirst();

  return result ? botFromRow(result) : undefined;
}
