import { sql } from 'kysely';
import { memorySources } from '#/types/memory.types';
import type { MemoryQueryListParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQueryList(deps: MemoryServiceDeps, params: MemoryQueryListParams) {
  let query = deps.database.db
    .selectFrom('memory')
    .leftJoin('user', (join) => join.onRef('user.id', '=', 'memory.subjectId').on('memory.subjectKind', '=', 'user'))
    .leftJoin('bot', (join) => join.onRef('bot.id', '=', 'memory.subjectId').on('memory.subjectKind', '=', 'bot'))
    .selectAll('memory')
    .select(['user.name as userName', 'bot.name as botName'])
    .where('memory.organizationId', '=', params.organizationId)
    .where('memory.scope', '=', params.scope.scope)
    .where('memory.ownerId', '=', params.scope.ownerId)
    .where('memory.text', 'is not', null);

  if (params.query) {
    query = query.where(sql<boolean>`instr(lower("memory"."text"), lower(${params.query})) > 0`);
  }

  if (params.before) {
    query = query.where('memory.id', '>', params.before);
  }

  const rows = await query
    .orderBy('memory.id')
    .limit(params.limit + 1)
    .execute();

  const page = rows.slice(0, params.limit);

  return {
    items: page.map((row) => ({ ...row, sources: memorySources.parse(JSON.parse(row.sources)) })),
    next: rows.length > params.limit ? page.at(-1)?.id : undefined,
  };
}
