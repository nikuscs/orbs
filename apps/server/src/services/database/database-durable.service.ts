import { DummyDriver, Kysely, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';
import { databaseActionMigrate } from './database-action.migrate';
import { databaseQueryExecute } from './database-query.execute';
import type { DatabaseTenantDurable, DatabaseTenantSchema } from '#/types/database-tenant.types';

export function makeDatabaseDurableService(storage: DurableObjectStorage): DatabaseTenantDurable {
  const db = new Kysely<DatabaseTenantSchema>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (kysely) => new SqliteIntrospector(kysely),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
  });

  return {
    db,
    all: (query) => databaseQueryExecute(storage, query).toArray(),
    run: (query) => {
      databaseQueryExecute(storage, query);
    },
    transaction: (operation) => storage.transactionSync(operation),
    migrate: () => databaseActionMigrate(storage),
  };
}
