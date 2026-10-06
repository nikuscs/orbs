import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces package boundary contracts', async () => {
  await arch()
    .expect('packages/**/*.ts')
    .not.toImportFrom(['@/server/**', '#/**', '#services/**', '../../apps/**']);

  await arch()
    .expect('apps/web/src/**/*.{ts,tsx}')
    .not.toImportFrom(['#/**', '#services/**']);
});
