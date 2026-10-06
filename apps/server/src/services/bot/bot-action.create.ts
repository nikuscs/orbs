import { BOT } from './bot.constants';
import { botAssertHandleFree, botFromRow, botHandle } from './bot.utils';
import type { Bot, BotActionCreateParams, BotServiceDeps } from '#/types/bot.types';
import type { DatabaseBot } from '#/types/database.types';

export async function botActionCreate(deps: BotServiceDeps, params: BotActionCreateParams): Promise<Bot> {
  const id = crypto.randomUUID();
  const handleFromName = botHandle(params.name);
  const handle = params.handle ?? (handleFromName || `bot-${id.slice(0, BOT.fallbackHandleIdChars)}`);
  await botAssertHandleFree(deps, { organizationId: params.organizationId, handle });

  const bot: DatabaseBot = {
    avatar: params.avatar === null ? null : JSON.stringify(params.avatar),
    id,
    organizationId: params.organizationId,
    name: params.name,
    handle,
    instructions: params.instructions,
    harnessId: params.harnessId,
    modelProvider: params.modelProvider,
    modelId: params.modelId,
    thinkingLevel: params.thinkingLevel,
    permission: params.permission,
    homeDir: params.homeDir ?? `${BOT.homeRoot}/${id}`,
    inherit: JSON.stringify(params.inherit),
    createdAt: new Date().toISOString(),
  };

  await deps.database.db
    .insertInto('bot')
    .values(bot)
    .execute();

  return botFromRow(bot);
}
