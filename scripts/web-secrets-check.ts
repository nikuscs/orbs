#!/usr/bin/env bun
// Deploy gate for apps/web: every key in .env.example is either a committed wrangler var or a
// Worker secret, never both, and the built APP_URL is https. Runs after `vite build`; the Worker
// must exist, so the very first deploy uploads secrets with it (`deploy:first`) and checks after.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface BuiltConfig {
  vars?: Partial<Record<string, string>>;
}

interface WorkerSecret {
  name: string;
}

const web = join(import.meta.dir, '../apps/web');

function readJson<T>(text: string): T {
  return JSON.parse(text);
}

function listSecrets(): WorkerSecret[] {
  try {
    // stderr is inherited so wrangler prints its own reason (not logged in, wrong account, ...).
    return readJson(execFileSync('bunx', ['wrangler', 'secret', 'list', '--format', 'json'], {
      cwd: web,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }));
  } catch {
    console.error('Could not list Worker secrets. If orbs-web was never deployed, run: bun run deploy:first (in apps/web)');
    process.exit(1);
  }
}

const keys = readFileSync(join(web, '.env.example'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .map((line) => line.split('=')[0].trim());

// `wrangler deploy` ships this generated file, so it is the config that goes live.
const vars = readJson<BuiltConfig>(readFileSync(join(web, 'dist/server/wrangler.json'), 'utf8')).vars ?? {};
const secrets = new Set(listSecrets().map((secret) => secret.name));

const problems = [
  ...(vars.APP_URL?.startsWith('https://') ? [] : [`APP_URL must be an https var in wrangler.jsonc, got "${vars.APP_URL ?? ''}"`]),
  ...keys.filter((key) => key in vars && secrets.has(key)).map((key) => `${key} is a wrangler var and a secret; run: bunx wrangler secret delete ${key}`),
  ...keys.filter((key) => !(key in vars) && !secrets.has(key)).map((key) => `${key} is missing; add it to .prod.vars and run: bun run secrets:push`),
];

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`All ${keys.length} production keys present (${secrets.size} secrets, APP_URL=${vars.APP_URL}).`);
