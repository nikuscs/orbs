import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces service assembly contracts', async () => {
  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.service.ts')
    .exports()
    .toOnlyExport(['make{Domain}Service', '{Domain}Service']);
});
