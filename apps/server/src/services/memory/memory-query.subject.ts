import { Errors } from '@orbs/errors/universal';
import type { MemoryActionSaveParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQuerySubject(
  deps: MemoryServiceDeps,
  params: Pick<MemoryActionSaveParams, 'organizationId' | 'subject'>,
): Promise<void> {
  if (params.subject.kind === 'room') {
    return;
  }

  const found =
    params.subject.kind === 'bot'
      ? await deps.database.db
        .selectFrom('bot')
        .select('id')
        .where('organizationId', '=', params.organizationId)
        .where('id', '=', params.subject.id)
        .executeTakeFirst()
      : await deps.database.db
        .selectFrom('member')
        .select('id')
        .where('organizationId', '=', params.organizationId)
        .where('userId', '=', params.subject.id)
        .executeTakeFirst();

  if (!found) {
    throw new Errors.NOT_FOUND({ resource: 'memory_subject' });
  }
}
