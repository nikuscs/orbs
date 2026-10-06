import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'server',
    globals: true,
    environment: 'node',
    include: ['./tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    testTimeout: 15_000,
    pool: 'threads',
  },
});
