import { SqliteAdapter, SqliteDialect } from 'kysely';
import { readFileSync } from 'node:fs';
import { databaseDriverBindings } from '../../types/database.types';
import type * as DatabaseTypes from '../../types/database.types';
import type { SqliteStatement } from 'kysely';
import type { MigrationProvider } from 'kysely/migration';

class DatabaseDriverAdapter extends SqliteAdapter {
  override get supportsTransactionalDdl(): boolean {
    return true;
  }
}

export function databaseDriverDialect(params: DatabaseTypes.DatabaseDriverParams): SqliteDialect {
  const dialect = new SqliteDialect({
    database: {
      close: () => params.database.close(),
      prepare: (sql): SqliteStatement => {
        const statement = params.database.prepare(sql);

        return {
          reader: statement.columns().length > 0,
          all: (parameters) => statement.all(...databaseDriverBindings.parse(parameters)),
          run: (parameters) => statement.run(...databaseDriverBindings.parse(parameters)),
          iterate: (parameters) => statement.iterate(...databaseDriverBindings.parse(parameters)),
        };
      },
    },
  });

  dialect.createAdapter = () => new DatabaseDriverAdapter();

  return dialect;
}

export function databaseDriverMigrations(params: DatabaseTypes.DatabaseDriverMigrationsParams): MigrationProvider {
  return {
    getMigrations: async () => Object.fromEntries(Object.entries(params.migrations).map(([name, sql]) => [name, {
      up: async () => {
        params.database.exec(sql);
      },
    }])),
  };
}

export function databaseDriverLoadMigrations() {
  return {
    '0001_init': readFileSync(new URL('./migrations/0001_init.sql', import.meta.url), 'utf8'),
    '0002_onboarding_existing': readFileSync(new URL('./migrations/0002_onboarding_existing.sql', import.meta.url), 'utf8'),
    '0003_bot_shared_skills': readFileSync(new URL('./migrations/0003_bot_shared_skills.sql', import.meta.url), 'utf8'),
    '0004_bot_shared_mcp': readFileSync(new URL('./migrations/0004_bot_shared_mcp.sql', import.meta.url), 'utf8'),
    '0005_bot_disabled_skills': readFileSync(new URL('./migrations/0005_bot_disabled_skills.sql', import.meta.url), 'utf8'),
  };
}
