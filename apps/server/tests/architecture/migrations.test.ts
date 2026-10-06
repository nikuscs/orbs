import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../src/services/database/migrations');
const MIGRATION_NAME = /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

test.each(['core', 'tenant'])('%s migration files use unique four-digit prefixes and snake-case names', (connection) => {
  const files = readdirSync(join(MIGRATIONS_DIR, connection)).filter((file) => file.endsWith('.sql'));

  const invalid = files.filter((file) => !MIGRATION_NAME.test(file));
  expect(invalid).toEqual([]);

  const prefixes = new Map<string, string[]>();

  for (const file of files) {
    const prefix = file.slice(0, 4);
    const list = prefixes.get(prefix) ?? [];
    list.push(file);
    prefixes.set(prefix, list);
  }

  const duplicates = [...prefixes.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([prefix, list]) => `${prefix}: ${list.join(', ')}`);

  expect(duplicates).toEqual([]);
});

test('migrations hold only the core and tenant connections', () => {
  expect(readdirSync(MIGRATIONS_DIR).sort()).toEqual(['core', 'tenant']);
});
