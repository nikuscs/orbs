import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces service boundary contracts', async () => {
  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-query.*.ts')
    .not.toUse(['insertInto', 'updateTable', 'deleteFrom', 'dispatch', 'send']);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.ts')
    .not.toImportFrom(['#services/*/*-action.*', '#services/*/*-query.*']);

  await arch()
    .expect('apps/{server,daemon}/src/core/core.services.ts')
    .not.toImportFrom(['#services/*/*-action.*', '#services/*/*-query.*']);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.service.ts')
    .not.toImportFrom(['#/core/core.services', '#services/core.services']);
});
