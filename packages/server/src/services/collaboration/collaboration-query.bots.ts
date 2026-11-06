import { COLLABORATION } from './collaboration.constants';
import type { CollaborationServiceDeps } from '../../types/collaboration.types';
import type { CollaborationBotParams } from '@repo/runtime/server';

export async function collaborationQueryBots({ database }: CollaborationServiceDeps, { botId }: CollaborationBotParams) {
  const bots = await database.db.selectFrom('bot')
    .select(['id', 'name', 'handle', 'instructions'])
    .where('id', '!=', botId)
    .orderBy('name')
    .execute();

  return bots.map(({ instructions, ...bot }) => ({
    ...bot,
    summary: instructions.replace(/\s+/g, ' ').trim().slice(0, COLLABORATION.maxSummaryLength),
  }));
}
