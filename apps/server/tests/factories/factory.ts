import type { Database, DatabaseSchema } from '#/types/database.types';
import type { Insertable, Selectable } from 'kysely';

export interface Sequence {
  next: () => number;
}

export function createSequence(): Sequence {
  let current = 0;

  return {
    next: () => {
      current += 1;

      return current;
    },
  };
}

export function defineFactory<TTable extends keyof DatabaseSchema>(table: TTable, define: (n: number) => Partial<Insertable<DatabaseSchema[TTable]>>) {
  return {
    bind: (database: Database, sequence: Sequence) => async (overrides: Partial<Insertable<DatabaseSchema[TTable]>> = {}) => {
      const row = { ...define(sequence.next()), ...overrides };

      // SAFETY: The table key ties this row to its schema; SQLite rejects missing required factory fields.
      const inserted = await database.db
        .insertInto(table)
        .values(row as never)
        .returningAll()
        .executeTakeFirstOrThrow();

      // SAFETY: returningAll selects the columns of this exact TTable; Kysely loses that generic correlation.
      return inserted as Selectable<DatabaseSchema[TTable]>;
    },
  };
}
