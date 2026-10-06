import { Errors } from '@orbs/errors/universal';
import { botAssertHandleFree, botFromRow } from './bot.utils';
import type { Bot, BotActionUpdateParams, BotServiceDeps } from '#/types/bot.types';
import type { DatabaseBotUpdate } from '#/types/database.types';

export async function botActionUpdate(deps: BotServiceDeps, params: BotActionUpdateParams): Promise<Bot> {
  const { botId, organizationId, avatar, inherit, ...fields } = params;

  if (fields.handle !== undefined) {
    await botAssertHandleFree(deps, {
      organizationId,
      handle: fields.handle,
      botId,
    });
  }

  const changes: DatabaseBotUpdate = fields;

  if (avatar !== undefined) {
    changes.avatar = avatar === null ? null : JSON.stringify(avatar);
  }

  if (inherit !== undefined) {
    changes.inherit = JSON.stringify(inherit);
  }

  const bot = await deps.database.db
    .updateTable('bot')
    .set(changes)
    .where('organizationId', '=', organizationId)
    .where('id', '=', botId)
    .returningAll()
    .executeTakeFirst();

  if (!bot) {
    throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: botId });
  }

  return botFromRow(bot);
}
