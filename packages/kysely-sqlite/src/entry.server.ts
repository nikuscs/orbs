import { SqliteAdapter, SqliteDialect } from 'kysely';
import { z } from 'zod';
import type * as SqliteTypes from './sqlite.types';
import type { SQLQueryBindings } from 'bun:sqlite';
import type { SqliteStatement } from 'kysely';
import type { MigrationProvider } from 'kysely/migration';

const sqliteParameters = z.array(z.union([z.null(), z.string(), z.number(), z.bigint(), z.boolean(), z.instanceof(Uint8Array)]));

class SqliteTransactionalAdapter extends SqliteAdapter {
  override get supportsTransactionalDdl(): boolean {
    return true;
  }
}

export function sqliteDialect(params: SqliteTypes.SqliteDialectParams): SqliteDialect {
  const dialect = new SqliteDialect({
    database: {
      close: () => params.database.close(),
      prepare: (sql): SqliteStatement => {
        const statement = params.database.prepare(sql);

        return {
          reader: statement.columnNames.length > 0,
          all: (parameters) => {
            try {
              return statement.all(...sqliteParameters.parse(parameters));
            } finally {
              statement.finalize();
            }
          },
          run: (parameters) => {
            try {
              return statement.run(...sqliteParameters.parse(parameters));
            } finally {
              statement.finalize();
            }
          },
          *iterate(parameters) {
            try {
              yield* statement.iterate(...sqliteParameters.parse(parameters));
            } finally {
              statement.finalize();
            }
          },
        };
      },
    },
  });

  dialect.createAdapter = () => new SqliteTransactionalAdapter();

  return dialect;
}

export function sqliteMigrationProvider(params: SqliteTypes.SqliteMigrationParams): MigrationProvider {
  return {
    getMigrations: async () => Object.fromEntries(Object.entries(params.migrations).map(([name, sql]) => [name, {
      up: async () => {
        params.database.run(sql);
      },
    }])),
  };
}

export function sqliteAll<O>(params: SqliteTypes.SqliteAllParams<O>): O[] {
  const { sql, parameters } = params.query.compile();
  const statement = params.database.prepare<O, SQLQueryBindings[]>(sql);

  try {
    return statement.all(...sqliteParameters.parse(parameters));
  } finally {
    statement.finalize();
  }
}
