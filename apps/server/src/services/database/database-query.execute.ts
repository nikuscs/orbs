import type { Compilable } from 'kysely';

export function databaseQueryExecute<O extends Record<string, SqlStorageValue>>(storage: DurableObjectStorage, query: Compilable<O>) {
  const { sql, parameters } = query.compile();
  return storage.sql.exec<O>(sql, ...parameters);
}
