import type { BotActionDeleteParams, BotServiceDeps } from '#/types/bot.types';

export async function botActionDelete(deps: BotServiceDeps, params: BotActionDeleteParams): Promise<void> {
  await deps.database.db
    .deleteFrom('bot')
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.botId)
    .execute();
}
