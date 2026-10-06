import { defineConfig } from 'oxlint';
import preset from 'oxlint-plugin-arch/presets/tanstack-start-react-modules-preset';
import { shadcnConfig } from './packages/tooling/src/oxlint/shadcn.ts';

const config = preset({
  root: import.meta.dirname,
  architecture: {
    'apps/web': 'web',
    'apps/server': 'server',
    'apps/daemon': 'runner',
    scripts: 'scripts',
    packages: 'packages',
  },
  modules: { customFileRoles: ['prompts', 'driver', 'options', 'bridge'] },
  imports: {
    backendEntryPoints: ['@orbs/server/client', '@orbs/server/daemon', '@orbs/server/server', '@orbs/server/rpc', '@orbs/server/cloudflare', '@orbs/server/native'],
  },
  ruleExclusions: {
    'arch/no-type-declarations': ['apps/server/src/core/core.container.ts'],
  },
});

export default defineConfig({
  ...config,
  overrides: [
    ...(config.overrides ?? []),
    ...(shadcnConfig.overrides ?? []),
    {
      files: ['apps/server/tests/architecture/**/*.test.ts'],
      rules: {
        'vitest/expect-expect': ['error', {
          assertFunctionNames: ['expect', 'expectTypeOf', 'assert', 'assertType', 'arch.**.to*'],
        }],
      },
    },
  ],
});
