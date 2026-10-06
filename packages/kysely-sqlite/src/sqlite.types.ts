import type { Database } from 'bun:sqlite';
import type { Compilable } from 'kysely';

export interface SqliteDialectParams {
  database: Database;
}

export interface SqliteAllParams<O> extends SqliteDialectParams {
  query: Compilable<O>;
}

export interface SqliteMigrationParams extends SqliteDialectParams {
  migrations: Record<string, string>;
}
