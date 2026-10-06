import { arch } from '@orbs/tooling/vitest/arch';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('enforces file location contracts', async () => {
  await arch()
    .expect('apps/{server,daemon,web}/src/**/*.types.ts')
    .ignore(['apps/{server,daemon,web}/src/types/**'])
    .toBeEmpty();

  const services = globSync('**/*.{ts,tsx}', { cwd: fileURLToPath(new URL('../../../web/src/services/', import.meta.url)) });

  for (const file of services) {
    const parts = file.split('/');

    expect(parts).toHaveLength(2);
    expect(parts[1].startsWith(`${parts[0]}.`) || parts[1].startsWith(`${parts[0]}-`)).toBe(true);
  }

  await arch()
    .expect('apps/web/src/services/**/*.{ts,tsx}')
    .fileNames()
    .toOnlyMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:-(?:action|query)\.[a-z0-9]+(?:-[a-z0-9]+)*)?\.(client|rsc|server)\.tsx?$|^[a-z0-9]+(?:-[a-z0-9]+)*\.(utils|constants)\.ts$/);
});
