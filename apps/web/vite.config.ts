import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import rsc from '@vitejs/plugin-rsc';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { experimental_readRawConfig } from 'wrangler';
import { createI18nPlugin } from './vite/i18n.vite.ts';
import { createIconsPlugin } from './vite/icons.vite.ts';
import { createReactPlugins } from './vite/react.vite.ts';
import { createTanstackStartPlugin } from './vite/tanstack-start.vite.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appVersion = process.env.VITE_APP_VERSION ?? `${execSync('git rev-parse --short HEAD').toString().trim()}.${Date.now().toString(36)}`;
// Canonical origin baked in at build time from the committed wrangler var, so neither a preview
// deploy nor a stray shell APP_URL can point canonicals somewhere else.
const { rawConfig } = experimental_readRawConfig({ config: join(__dirname, 'wrangler.jsonc') });
const configuredAppUrl = rawConfig.vars?.APP_URL;

if (typeof configuredAppUrl !== 'string') {
  throw new Error('wrangler.jsonc must set vars.APP_URL');
}

const appUrl = configuredAppUrl.replace(/\/$/, '');

export default defineConfig(({ mode }) => {
  const native = mode === 'native';

  return {
    clearScreen: false,
    build: native ? { outDir: join('dist', 'native') } : undefined,
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_APP_URL': JSON.stringify(appUrl),
    },
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
    plugins: [
      ...(native ? [] : [cloudflare({ viteEnvironment: { name: 'ssr', childEnvironments: ['rsc'] } })]),
      tailwindcss(),
      createTanstackStartPlugin(native ? 'server.native.ts' : 'server.cloudflare.ts'),
      rsc(),
      createIconsPlugin(),
      createI18nPlugin(__dirname),
      ...createReactPlugins(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
