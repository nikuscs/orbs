import { sqliteAll, sqliteDialect, sqliteMigrationProvider } from '@orbs/kysely-sqlite/server';
import { Database as Sqlite } from 'bun:sqlite';
import { Kysely } from 'kysely';
import { Migrator } from 'kysely/migration';
import { basename } from 'node:path';
import { databaseLogQuery } from './database.utils';
import type { DatabaseConnection, DatabaseConnectionParams } from '#/types/database.types';

export function makeDatabaseService<Schema>(params: DatabaseConnectionParams): DatabaseConnection<Schema> {
  const sqlite = new Sqlite(params.path, { create: true, strict: true });

  sqlite.run('pragma journal_mode = wal');
  sqlite.run('pragma foreign_keys = on');

  const db = new Kysely<Schema>({
    dialect: sqliteDialect({ database: sqlite }),
    log: params.env.DEBUG_QUERIES ? databaseLogQuery : undefined,
  });

  return {
    db,
    all: (query) => sqliteAll({ database: sqlite, query }),
    run: (query) => {
      sqliteAll({ database: sqlite, query });
    },
    transaction: (operation) => sqlite.transaction(operation)(),
    batch: async (queries) => {
      sqlite.transaction(() => {
        for (const query of queries) {
          sqliteAll({ database: sqlite, query });
        }
      })();
    },
    migrate: async () => {
      const migrations = Object.fromEntries(Object.entries(params.migrations).map(([file, sql]) => [basename(file), sql]));
      const migrator = new Migrator({ db, provider: sqliteMigrationProvider({ database: sqlite, migrations }) });
      const { error } = await migrator.migrateToLatest();

      if (error) {
        throw error;
      }
    },
    close: () => sqlite.close(),
  };
}
