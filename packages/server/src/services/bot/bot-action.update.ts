import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { botActionConfigure } from './bot-action.configure';
import { botActionStart } from './bot-action.start';
import { botRecord, botValues } from './bot.utils';
import type { BotServiceDeps } from '../../types/bot.types';
import type { BotUpdateInput } from '@repo/contracts/universal';

export async function botActionUpdate(deps: BotServiceDeps, { botId, ...changes }: BotUpdateInput) {
  const shouldStart = await deps.database.db.transaction().execute(async (tx) => {
    const row = await tx.selectFrom('bot').selectAll().where('id', '=', botId).executeTakeFirst();

    const previous = match(row)
      .with(P.nonNullable, botRecord)
      .otherwise(() => {
        throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: botId });
      });

    const bot = { ...previous, ...changes, updatedAt: Date.now() };
    deps.runtime.queries.validateModel(bot);

    const duplicate = await tx.selectFrom('bot').select('id')
      .where('handle', '=', bot.handle).where('id', '!=', botId).executeTakeFirst();

    match(duplicate).with(P.nonNullable, () => {
      throw new Errors.CONFLICT();
    }).otherwise(() => undefined);

    await tx.updateTable('bot').set({ ...botValues(bot), updatedAt: bot.updatedAt }).where('id', '=', botId).execute();

    return !previous.instructions.trim() && Boolean(bot.instructions.trim());
  });

  for (const listener of deps.changes) {
    listener();
  }

  const bot = await botActionConfigure(deps, { botId });

  if (shouldStart) {
    await botActionStart(deps, { botId });
  }

  return bot;
}
