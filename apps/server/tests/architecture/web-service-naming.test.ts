import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('web service exports start with their file prefix', async () => {
  await arch()
    .expect('apps/web/src/services/*.client.{ts,tsx}')
    .exports()
    .toStartWithFilePrefix();
});
