import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces server architecture contracts', async () => {
  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.service.ts')
    .topLevelFunctions()
    .toOnlyMatch(/^make[A-Z].*Service$/);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.service.ts')
    .exports()
    .toMatchFileName({
      file: '{domain}.service.ts',
      function: 'make{Domain}Service',
      type: '{Domain}Service',
    });

  await arch()
    .expect('apps/{server,daemon}/src/types/**/*.types.ts')
    .toContainNoFunctions();

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.constants.ts')
    .toOnlyHaveConstants();

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.constants.ts')
    .exports()
    .toStartWithFilePrefix();

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-action.*.ts')
    .fileNames()
    .toMatchActionFileName();

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-action.*.ts')
    .exports()
    .toOnlyMatchFactoryName('{domain}-action.{name}.ts', '{domain}Action{Name}');

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-query.*.ts')
    .fileNames()
    .toMatchQueryFileName();

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-query.*.ts')
    .exports()
    .toOnlyMatchFactoryName('{domain}-query.{name}.ts', '{domain}Query{Name}');

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-query.*.ts')
    .not.toUse(['insertInto', 'updateTable', 'deleteFrom']);

  await arch()
    .expect('apps/{server,daemon}/src/**/*.ts')
    .not.toImportFrom(['@/server/**', '@/components/**', '@/routes/**']);

  await arch()
    .expect('apps/web/src/**/*.{ts,tsx}')
    .not.toImportFrom(['#/**', '#services/**']);
});
