import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces action and query function contracts', async () => {
  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-action.*.ts')
    .exports()
    .toMatchFactoryName('{domain}-action.{name}.ts', '{domain}Action{Name}');

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*-query.*.ts')
    .exports()
    .toMatchFactoryName('{domain}-query.{name}.ts', '{domain}Query{Name}');
});
