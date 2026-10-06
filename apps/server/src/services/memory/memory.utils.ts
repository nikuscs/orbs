import { Errors } from '@orbs/errors/universal';
import { memorySources } from '#/types/memory.types';
import { routeRedact } from '#services/route/route.utils';
import type { DatabaseMemoryTable } from '#/types/database.types';
import type { MemoryScope, MemorySource } from '#/types/memory.types';

export function memoryAssertEditable(row: DatabaseMemoryTable | undefined, scope: MemoryScope, revision: number): DatabaseMemoryTable {
  if (!row || row.scope !== scope.scope || row.ownerId !== scope.ownerId) {
    throw new Errors.NOT_FOUND({ resource: 'memory' });
  }

  if (row.text === null || row.revision !== revision) {
    throw new Errors.CONFLICT();
  }

  return row;
}

export function memorySafeText(text: string): string {
  if (routeRedact(text) !== text) {
    throw new Errors.VALIDATION_ERROR({ fields: { text: { message: 'validation_memory_secret' } } });
  }

  return text;
}

export function memoryMergeSources(previous: string, next: MemorySource[]): string {
  const sources = memorySources.parse(JSON.parse(previous));
  const merged = new Map(sources.map((source) => [source.messageId, source]));

  for (const source of next) {
    merged.set(source.messageId, source);
  }

  const result = memorySources.safeParse([...merged.values()]);

  if (!result.success) {
    throw new Errors.VALIDATION_ERROR({ fields: { sourceMessageIds: { message: 'validation_memory_sources' } } });
  }

  return JSON.stringify(result.data);
}
