import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces rpc boundary contracts', async () => {
  await arch()
    .expect('apps/server/src/rpc/rpc.*.ts')
    .not.toContain(['z.object(', 'z.array(', 'z.enum(', 'z.string(', 'z.number(', 'z.literal(', 'z.coerce']);

  await arch()
    .expect('apps/server/src/rpc/rpc.*.ts')
    .not.toImportFrom(['kysely']);

  await arch()
    .expect('apps/server/src/rpc/rpc.*.ts')
    .not.toUse(['selectFrom', 'insertInto', 'updateTable', 'deleteFrom']);
});
