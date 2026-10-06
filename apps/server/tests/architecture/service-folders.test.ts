import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const IGNORE = new Set(['database', 'rate-limiter', 'security']);
const SERVICES_DIR = join(import.meta.dirname, '../../src/services');
const REGISTRY_FILE = join(import.meta.dirname, '../../src/core/core.services.ts');

test('every domain service folder contains a service registered in core services', () => {
  const folders = readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORE.has(entry.name))
    .map((entry) => entry.name);

  const missing = folders.filter(
    (folder) => !existsSync(join(SERVICES_DIR, folder, `${folder}.service.ts`)),
  );

  expect(missing).toEqual([]);

  const registrySource = readFileSync(REGISTRY_FILE, 'utf8');

  const unregistered = folders
    .filter((folder) => existsSync(join(SERVICES_DIR, folder, `${folder}.service.ts`)))
    .filter((folder) => {
      const registryKey = folder.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
      return !registrySource.includes(`${registryKey}:`);
    });

  expect(unregistered).toEqual([]);
});
