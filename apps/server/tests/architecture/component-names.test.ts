import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces component file name and export name', async () => {
  await arch()
    .expect('apps/web/src/components/**/*.tsx')
    .ignore(['**/*.test.tsx', 'apps/web/src/components/ui/**'])
    .exports()
    .toMatchComponentExport();
});
