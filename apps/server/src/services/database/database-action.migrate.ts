import { DATABASE } from './database.constants';

export function databaseActionMigrate(storage: DurableObjectStorage): void {
  storage.sql.exec('create table if not exists "migration" ("id" integer not null primary key)');
  const applied = storage.sql.exec<{ id: number }>('select coalesce(max("id"), 0) as "id" from "migration"').one().id;

  const pending = Object
    .entries(DATABASE.tenantMigrations)
    .map(([file, sql]) => ({ id: Number(/\/(\d{4})_[^/]+\.sql$/.exec(file)?.[1]), sql }))
    .filter((migration) => migration.id > applied)
    .sort((left, right) => left.id - right.id);

  for (const migration of pending) {
    storage.transactionSync(() => {
      storage.sql.exec(migration.sql);
      storage.sql.exec('insert into "migration" ("id") values (?)', migration.id);
    });
  }
}
