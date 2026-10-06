import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces component file name starts with parent folder or its singular', async () => {
  await arch()
    .expect('apps/web/src/components/**/*.tsx')
    .ignore(['**/*.test.tsx', 'apps/web/src/components/ui/**'])
    .fileNames()
    .toMatchFolderPrefix();
});
