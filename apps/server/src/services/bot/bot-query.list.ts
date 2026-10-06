import { botFromRow } from './bot.utils';
import type { Bot, BotQueryListParams, BotServiceDeps } from '#/types/bot.types';

export async function botQueryList(deps: BotServiceDeps, params: BotQueryListParams): Promise<Bot[]> {
  const result = await deps.database.db
    .selectFrom('bot')
    .selectAll()
    .where('organizationId', '=', params.organizationId)
    .orderBy('createdAt', 'asc')
    .execute();

  return result.map(botFromRow);
}
