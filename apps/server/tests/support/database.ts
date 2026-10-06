import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { makeDatabaseD1Service } from '#services/database/database-d1.service';
import { makeDatabaseDurableService } from '#services/database/database-durable.service';
import { TEST_ENV } from './env';
import type { DatabaseTenantDurable } from '#/types/database-tenant.types';
import type { Database } from '#/types/database.types';
import type { SQLInputValue } from 'node:sqlite';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../src/services/database/migrations/core');

const MIGRATIONS_SQL = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n');

type D1BindValue = SQLInputValue | boolean | undefined;

export interface TestD1 {
  d1: D1Database;
  database: Database;
  close: () => void;
}

export interface TestTenant {
  database: DatabaseTenantDurable;
  close: () => void;
}

function sqlValue(value: D1BindValue): SQLInputValue {
  if (value === undefined) {
    return null;
  }

  if (value === true || value === false) {
    return value ? 1 : 0;
  }

  return value;
}

export function createTestD1(): TestD1 {
  const sqlite = new DatabaseSync(':memory:');
  const executors = new WeakMap<D1PreparedStatement, () => D1Result>();

  sqlite.exec(MIGRATIONS_SQL);

  const execute = (query: string, values: SQLInputValue[]): D1Result => {
    const statement = sqlite.prepare(query);
    const meta = { duration: 0, size_after: 0, rows_read: 0, rows_written: 0, changed_db: false, changes: 0, last_row_id: 0 };

    if (statement.columns().length > 0) {
      const results = statement.all(...values);

      return { success: true, results, meta: { ...meta, changes: results.length, changed_db: results.length > 0 } };
    }

    const outcome = statement.run(...values);
    const changes = Number(outcome.changes);

    return { success: true, results: [], meta: { ...meta, changes, changed_db: changes > 0, last_row_id: Number(outcome.lastInsertRowid) } };
  };

  const prepare = (query: string, values: SQLInputValue[] = []): D1PreparedStatement => {
    // SAFETY: The D1 dialect only calls bind/all; this SQLite test adapter implements both.
    const statement = {
      bind: (...next: D1BindValue[]) => prepare(query, next.map(sqlValue)),
      all: async () => execute(query, values),
    } as D1PreparedStatement;

    executors.set(statement, () => execute(query, values));

    return statement;
  };

  const batch = async (statements: D1PreparedStatement[]) => {
    sqlite.exec('BEGIN');

    try {
      const results = statements.map((statement) => {
        const run = executors.get(statement);

        if (!run) {
          throw new TypeError('Statement was not prepared by this test database');
        }

        return run();
      });

      sqlite.exec('COMMIT');

      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };

  // SAFETY: Tests exercise prepare/batch/exec only; sessions and database dumps are not used.
  const d1 = {
    prepare: (query: string) => prepare(query),
    batch,
    exec: async (query: string) => {
      sqlite.exec(query);

      return { count: 1, duration: 0 };
    },
  } as D1Database;

  return { d1, database: makeDatabaseD1Service({ d1, env: TEST_ENV }), close: () => sqlite.close() };
}

export function createTestTenant(): TestTenant {
  const sqlite = new DatabaseSync(':memory:');

  const exec = (query: string, ...values: SQLInputValue[]) => {
    if (values.length === 0 && /;\s*\S/.test(query)) {
      sqlite.exec(query);

      return { toArray: () => [], one: () => undefined };
    }

    const statement = sqlite.prepare(query);
    const rows = statement.columns().length > 0 ? statement.all(...values) : [];

    if (statement.columns().length === 0) {
      statement.run(...values);
    }

    return { toArray: () => rows, one: () => rows[0] };
  };

  const transactionSync = <T>(operation: () => T): T => {
    sqlite.exec('savepoint test');

    try {
      const result = operation();
      sqlite.exec('release test');

      return result;
    } catch (error) {
      sqlite.exec('rollback to test');
      sqlite.exec('release test');
      throw error;
    }
  };

  // SAFETY: The tenant adapter only uses sql.exec cursors and transactionSync, implemented above.
  const storage = { sql: { exec }, transactionSync } as DurableObjectStorage;
  const database = makeDatabaseDurableService(storage);
  database.migrate();

  return { database, close: () => sqlite.close() };
}
