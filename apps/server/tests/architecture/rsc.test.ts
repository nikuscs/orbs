import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces RSC contracts', async () => {
  await arch()
    .expect('apps/web/src/**/*.{ts,tsx}')
    .ignore(['apps/web/src/services/*/*.rsc.{ts,tsx}'])
    .not.toImportFrom(['@tanstack/react-start/rsc']);

  await arch()
    .expect('apps/web/src/services/*/*.rsc.{ts,tsx}')
    .exports()
    .toStartWithFilePrefix();

  await arch()
    .expect('apps/web/src/services/*/*.rsc.{ts,tsx}')
    .exports()
    .toOnlyMatch(/^[a-z][a-z0-9]*Rsc[A-Z][a-zA-Z0-9]*$/);
});
