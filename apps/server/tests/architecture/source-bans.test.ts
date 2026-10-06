import { arch } from '@orbs/tooling/vitest/arch';
import { test } from 'vitest';

test('enforces source substring bans', async () => {
  await arch()
    .expect('apps/web/src/**/*.{ts,tsx}')
    .not.toContain(['useMemo(', 'useCallback(', 'React.memo(', 'data-testid=']);

  await arch()
    .expect('apps/**/src/**/*.{ts,tsx}')
    .not.toContain(['@ts-ignore', '@ts-expect-error']);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.ts')
    .not.toContain(['console.log(', 'console.warn(', 'console.error(']);

  await arch()
    .expect('apps/{server,daemon}/src/**/*.ts')
    .not.toContain(['(trx)', ', trx)', 'async (trx']);

  await arch()
    .expect('apps/{server,daemon}/src/services/**/*.ts')
    .not.toContain(['throw new Error(']);
});
