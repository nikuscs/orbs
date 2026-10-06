import { Errors } from '@orbs/errors/universal';
import { botAvatar, botInherit } from '#/types/bot.types';
import { ROOM } from '#services/room/room.constants';
import { BOT } from './bot.constants';
import type { Bot, BotAssertHandleFreeParams, BotServiceDeps } from '#/types/bot.types';
import type { DatabaseBot } from '#/types/database.types';

export function botFromRow(row: DatabaseBot): Bot {
  return {
    ...row,
    avatar: row.avatar === null ? null : botAvatar.parse(JSON.parse(row.avatar)),
    inherit: botInherit.parse(JSON.parse(row.inherit)),
  };
}

export function botHandle(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/gu, '')
    .trim()
    .replaceAll(/[\s-]+/gu, '-')
    .slice(0, BOT.handleMaxLength)
    .replaceAll(/^-+|-+$/gu, '');
}

export async function botAssertHandleFree(deps: BotServiceDeps, params: BotAssertHandleFreeParams): Promise<void> {
  const takenByAnotherBot = await deps.database.db
    .selectFrom('bot')
    .select('id')
    .where('organizationId', '=', params.organizationId)
    .where('handle', '=', params.handle)
    .where('id', '!=', params.botId ?? '')
    .executeTakeFirst();

  if (takenByAnotherBot || ROOM.everyoneHandles.has(params.handle)) {
    throw new Errors.VALIDATION_ERROR({ fields: { handle: { message: 'already_taken' } } });
  }
}
