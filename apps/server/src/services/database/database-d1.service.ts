import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { databaseLogQuery } from './database.utils';
import type { CloudflareDatabaseParams } from '#/types/cloudflare.types';
import type { Database, DatabaseSchema } from '#/types/database.types';

export function makeDatabaseD1Service(params: CloudflareDatabaseParams): Database {
  const db = new Kysely<DatabaseSchema>({
    dialect: new D1Dialect({ database: params.d1 }),
    log: params.env.DEBUG_QUERIES ? databaseLogQuery : undefined,
  });

  return {
    db,
    batch: async (queries) => {
      await params.d1.batch(queries.map((query) => {
        const { sql, parameters } = query.compile();
        return params.d1.prepare(sql).bind(...parameters);
      }));
    },
  };
}
