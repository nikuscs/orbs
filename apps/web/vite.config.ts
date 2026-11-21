import { env } from '@repo/env/server';
import tailwindcss from '@tailwindcss/vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { createFilesPlugin } from './vite/files.vite.ts';
import { createI18nPlugin } from './vite/i18n.vite.ts';
import { createIconsPlugin } from './vite/icons.vite.ts';
import { createMarkdownPlugin } from './vite/markdown.vite.ts';
import { createReactPlugins } from './vite/react.vite.ts';
import { createTanstackStartPlugin } from './vite/tanstack-start.vite.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dev always runs the local dev daemon next to Vite; built web servers pick the paired daemon's address from the connection cookie.
const DEV_DAEMON = `http://127.0.0.1:${env.DAEMON_PORT}`;

// Vite's default CORS middleware answers preflights itself; the sandboxed computer viewer sends Origin: null, and the daemon's /computers route must answer those.
const DEV_ORIGINS = /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/u;

export default defineConfig({
  clearScreen: false,
  envDir: '../..',
  server: {
    host: true,
    cors: { origin: DEV_ORIGINS, preflightContinue: true },
    proxy: {
      '/rpc': { target: DEV_DAEMON, ws: true },
      '/files': { target: DEV_DAEMON },
      '/computers': { target: DEV_DAEMON, ws: true },
      '/avatars': { target: DEV_DAEMON },
      '/health': { target: DEV_DAEMON },
      '/mcp/callback': { target: DEV_DAEMON },
    },
  },
  preview: {
    host: true,
  },
  plugins: [
    tailwindcss(),
    createTanstackStartPlugin(),
    createIconsPlugin(),
    createMarkdownPlugin(),
    createFilesPlugin(),
    createI18nPlugin(__dirname),
    ...createReactPlugins(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
