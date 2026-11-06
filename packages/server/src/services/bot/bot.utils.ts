import { botAvatar, botFields, botInherit, modelSelection } from '@repo/contracts/universal';
import { match } from 'ts-pattern';
import type { BotServiceDeps } from '../../types/bot.types';
import type { DatabaseBot } from '../../types/database.types';
import type { Bot, BotCreateInput } from '@repo/contracts/universal';

export function botRecord(row: DatabaseBot): Bot {
  return {
    ...row,
    avatar: botAvatar.nullable().parse(JSON.parse(row.avatar ?? 'null')),
    inherit: botInherit.parse(JSON.parse(row.inherit)),
    fallbackModel: modelSelection.nullable().parse(JSON.parse(row.fallbackModel ?? 'null')),
    sharedSkills: botFields.shape.sharedSkills.parse(JSON.parse(row.sharedSkills ?? 'null')),
    sharedMcp: botFields.shape.sharedMcp.parse(JSON.parse(row.sharedMcp ?? 'null')),
    disabledSkills: botFields.shape.disabledSkills.parse(JSON.parse(row.disabledSkills ?? 'null')),
  };
}

export function botValues(bot: BotCreateInput) {
  return {
    ...bot,
    avatar: JSON.stringify(bot.avatar),
    inherit: JSON.stringify(bot.inherit),
    fallbackModel: JSON.stringify(bot.fallbackModel),
    sharedSkills: JSON.stringify(bot.sharedSkills?.length ? bot.sharedSkills : null),
    sharedMcp: JSON.stringify(bot.sharedMcp?.length ? bot.sharedMcp : null),
    disabledSkills: JSON.stringify(bot.disabledSkills?.length ? bot.disabledSkills : null),
  };
}

export async function botQueue<T>(deps: BotServiceDeps, botId: string, run: () => Promise<T>) {
  const previous = deps.queues.get(botId) ?? Promise.resolve();
  const current = previous.then(run);
  const settled = current.then(() => undefined, () => undefined);
  deps.queues.set(botId, settled);

  try {
    return await current;
  } finally {
    match(deps.queues.get(botId) === settled)
      .with(true, () => {
        deps.queues.delete(botId);
      })
      .with(false, () => undefined)
      .exhaustive();
  }
}
