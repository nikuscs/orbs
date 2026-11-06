import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const name = process.env.APP_NAME ?? 'Orbs';
const args = process.argv.slice(2);
const draft = args.includes('--draft');
const current = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
// Releases bump the patch version unless a version is given.
const version = args.find((arg) => !arg.startsWith('--')) ?? current.replace(/\d+$/u, (patch: string) => String(Number(patch) + 1));
const tag = `v${version}`;
// A neutral folder keeps the build machine's home path out of bundled __filename values and route manifests.
const build = path.join('/private/tmp', `orbs-release-${version}`);
let tagged = false;

function fail(message: string): never {
  console.error(message);

  if (tagged) {
    console.error(`Undo the release commit: git worktree remove --force ${build}; git tag -d ${tag} && git reset --hard origin/main`);
  }

  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (result.exitCode !== 0) {
    fail(`${command.slice(0, 3).join(' ')} failed:\n${result.stdout.toString()}${result.stderr.toString()}`);
  }

  return result.stdout.toString().trim();
}

function step(command: string[], cwd = root) {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (!result.success) {
    fail(`${command.join(' ')} failed.`);
  }
}

function bump() {
  for (const file of run(['git', 'ls-files', 'package.json', '*/package.json']).split('\n')) {
    const full = path.join(root, file);
    const content = readFileSync(full, 'utf8');

    writeFileSync(full, content.replace(/"version": "[^"]+"/u, `"version": "${version}"`));
  }
}

function notes(): string {
  const previous = Bun.spawnSync(['git', 'describe', '--tags', '--abbrev=0', `${tag}^`], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'ignore',
  });

  const range = previous.success ? `${previous.stdout.toString().trim()}..${tag}^` : `${tag}^`;

  return run(['git', 'log', '--no-merges', '--format=- %s', range]);
}

if (!/^\d+\.\d+\.\d+$/u.test(version)) {
  fail('Usage: bun run release [major.minor.patch] [--draft]');
}

if (run(['git', 'status', '--porcelain'])) {
  fail('Commit or stash your changes first.');
}

if (run(['git', 'branch', '--show-current']) !== 'main') {
  fail('Release from main.');
}

run(['git', 'fetch', 'origin', 'main', '--tags']);

if (run(['git', 'rev-parse', 'HEAD']) !== run(['git', 'rev-parse', 'origin/main'])) {
  fail('main must match origin/main.');
}

if (run(['git', 'tag', '--list', tag])) {
  fail(`${tag} already exists.`);
}

if (existsSync(build)) {
  fail(`${build} already exists: remove it first.`);
}

step(['bun', 'run', 'check']);
step(['bun', 'run', 'lint']);

bump();
run(['bun', 'install']);
run(['git', 'commit', '--all', '--message', `Release ${tag}`]);
run(['git', 'tag', '--annotate', tag, '--message', `${name} ${tag}`]);
tagged = true;

run(['git', 'worktree', 'add', '--detach', build, tag]);
step(['bun', 'install', '--frozen-lockfile'], build);
step(['bun', 'scripts/desktop.ts', 'release'], build);

const artifacts = path.join(build, 'apps/desktop/artifacts');
const desktop = path.join(artifacts, `${name}-${version}-macos-arm64.zip`);
const server = path.join(artifacts, `${name}-${version}-server.tar.gz`);
const updateManifest = path.join(artifacts, 'stable-macos-arm64-update.json');
const updateBundle = path.join(artifacts, JSON.parse(readFileSync(updateManifest, 'utf8')).artifact.file);

if (Bun.spawnSync(['grep', '-rqF', '--', homedir(), 'apps/desktop/dist/server'], { cwd: build }).exitCode === 0) {
  fail(`The server bundle contains ${homedir()}. Nothing was pushed.`);
}

run(['tar', '-czf', server, '-C', path.join(build, 'apps/desktop/dist'), 'server']);

run(['git', 'push', '--atomic', 'origin', 'main', tag]);
run(['gh', 'release', 'create', tag, desktop, server, updateManifest, updateBundle, '--verify-tag', ...(draft ? ['--draft'] : []), '--title', `${name} ${tag}`, '--notes', notes()]);
run(['git', 'worktree', 'remove', '--force', build]);

console.log(`Released ${tag}: ${run(['gh', 'release', 'view', tag, '--json', 'url', '--jq', '.url'])}`);
