import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces import hygiene contracts', async () => {
  await arch()
    .expect('apps/**/*.{ts,tsx}')
    .not.toImportFrom(['zod/v4']);

  await arch()
    .expect('packages/**/*.ts')
    .not.toImportFrom(['zod/v4']);

  await arch()
    .expect('apps/web/src/**/*.tsx')
    .not.toImportFrom(['@orbs/server/rpc', '@orbs/server/security', '@orbs/server/server', '@orbs/server/services', '#/**', '#services/**']);

  await arch()
    .expect('apps/web/src/routes/handlers/**/*.ts')
    .not.toImportFrom(['@orbs/server/client']);

  await arch()
    .expect('apps/web/src/routes/handlers/**/*.ts')
    .not.toDynamicallyImportFrom(['@orbs/server/client']);

  await arch()
    .expect('apps/web/src/**/*.{ts,tsx}')
    .not.toImportFrom(['@/services/*.service']);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.ts')
    .not.toImportFrom(['@orbs/server/rpc', '@orbs/server/security', '@orbs/server/server', '@orbs/server/services']);

  await arch()
    .expect('apps/server/src/rpc/*.ts')
    .not.toImportFrom(['#services/service']);
});
