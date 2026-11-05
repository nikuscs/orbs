import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { botActionConfigure } from './bot-action.configure';
import { botActionStart } from './bot-action.start';
import { botValues } from './bot.utils';
import type { BotServiceDeps } from '../../types/bot.types';
import type { BotCreateInput } from '@repo/contracts/universal';

export async function botActionCreate(deps: BotServiceDeps, params: BotCreateInput) {
  deps.runtime.queries.validateModel(params);

  const botId = await deps.database.db.transaction().execute(async (tx) => {
    const now = Date.now();

    const saved = await tx.insertInto('bot')
      .values({
        ...botValues(params),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })
      .onConflict((conflict) => conflict.column('handle').doNothing())
      .returning('id').executeTakeFirst();

    const id = match(saved)
      .with(P.nonNullable, (value) => value.id)
      .otherwise(() => {
        throw new Errors.CONFLICT();
      });

    return id;
  });

  for (const listener of deps.changes) {
    listener();
  }

  const bot = await botActionConfigure(deps, { botId });

  if (bot.instructions.trim()) {
    await botActionStart(deps, { botId });
  }

  return bot;
}
