import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const desktop = path.join(root, 'apps/desktop');
const name = process.env.APP_NAME ?? 'Orbs';
const entitlements = ['allow-jit', 'allow-unsigned-executable-memory', 'disable-library-validation'];
const isDarwin = process.platform === 'darwin';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[], env: Record<string, string | undefined> = process.env): string {
  const result = Bun.spawnSync(command, {
    cwd: root,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (result.exitCode !== 0) {
    fail(`${command.slice(0, 3).join(' ')} failed:\n${result.stdout.toString()}${result.stderr.toString()}`);
  }

  return result.stdout.toString().trim();
}

function files(folder: string): string[] {
  return readdirSync(folder).flatMap((entry) => {
    const file = path.join(folder, entry);

    return statSync(file).isDirectory() ? files(file) : [file];
  });
}

async function bundle() {
  const target = path.join(desktop, 'dist/server');

  rmSync(target, { recursive: true, force: true });

  const web = Bun.spawnSync(['bun', 'run', 'build'], {
    cwd: path.join(root, 'apps/web'),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (!web.success) {
    process.exit(1);
  }

  const builds = await Promise.all([
    Bun.build({
      entrypoints: [path.join(root, 'apps/web/src/application/server.bun.ts')],
      target: 'bun',
      outdir: path.join(target, 'web/src/application'),
    }),
    Bun.build({
      entrypoints: [path.join(root, 'apps/web/dist/server/server.tanstack.js')],
      target: 'bun',
      splitting: true,
      outdir: path.join(target, 'web/dist/server'),
    }),
    Bun.build({
      entrypoints: [path.join(root, 'apps/daemon/src/entry.native.ts')],
      target: 'bun',
      outdir: path.join(target, 'daemon'),
    }),
  ]);

  const failed = builds.find((result) => !result.success);

  if (failed) {
    fail(failed.logs.join('\n'));
  }

  cpSync(path.join(root, 'apps/web/dist/client'), path.join(target, 'web/dist/client'), { recursive: true });
  cpSync(path.join(root, 'packages/server/src/services/database/migrations'), path.join(target, 'daemon/migrations'), { recursive: true });
}

function plist() {
  // Info.plist modification via PlistBuddy is strictly for macOS .app bundles.
  if (!isDarwin) {
    return;
  }

  const { ELECTROBUN_BUILD_DIR: buildDir, ELECTROBUN_APP_NAME: appName } = process.env;

  if (!buildDir || !appName) {
    fail('Run plist as the Electrobun postBuild hook.');
  }

  const file = path.join(buildDir, `${appName}.app/Contents/Info.plist`);
  const key = ':NSAppTransportSecurity:NSAllowsArbitraryLoadsInWebContent';

  Bun.spawnSync(['/usr/libexec/PlistBuddy', '-c', 'Add :NSAppTransportSecurity dict', file], { stderr: 'ignore' });
  run(['/usr/libexec/PlistBuddy', '-c', `Add ${key} bool true`, '-c', `Set ${key} true`, file]);
  Bun.spawnSync(['/usr/libexec/PlistBuddy', '-c', 'Delete :NSUserActivityTypes', file], { stderr: 'ignore' });
  run(['/usr/libexec/PlistBuddy', '-c', 'Add :NSUserActivityTypes array', '-c', 'Add :NSUserActivityTypes:0 string INSendMessageIntent', file]);
}

function release() {
  const app = path.join(desktop, `build/stable-macos-arm64/${name}.app`);
  const keychain = process.env.DESKTOP_SIGNING_KEYCHAIN ?? fail('Set DESKTOP_SIGNING_KEYCHAIN to the signing keychain path.');
  const identity = process.env.DESKTOP_SIGNING_IDENTITY ?? fail('Set DESKTOP_SIGNING_IDENTITY to the Developer ID SHA-1 fingerprint.');
  const credentialsFile = path.join(path.dirname(keychain), 'credentials.json');
  const credentials = existsSync(credentialsFile) ? JSON.parse(readFileSync(credentialsFile, 'utf8')) : {};
  const password = process.env.DESKTOP_SIGNING_KEYCHAIN_PASSWORD ?? credentials.releaseKeychainPassword ?? fail('Set DESKTOP_SIGNING_KEYCHAIN_PASSWORD.');
  const keyId = process.env.DESKTOP_NOTARY_KEY_ID ?? credentials.apiKeyId ?? fail('Set DESKTOP_NOTARY_KEY_ID.');
  const issuer = process.env.DESKTOP_NOTARY_ISSUER ?? credentials.apiIssuerId ?? fail('Set DESKTOP_NOTARY_ISSUER.');
  const key = process.env.DESKTOP_NOTARY_KEY_PATH ?? path.join(path.dirname(keychain), `AuthKey_${keyId}.p8`);
  const version = JSON.parse(readFileSync(path.join(desktop, 'package.json'), 'utf8')).version;

  if (!/^[0-9A-F]{40}$/iu.test(identity)) {
    fail('DESKTOP_SIGNING_IDENTITY must be the 40-character SHA-1 fingerprint.');
  }

  if (!existsSync(key)) {
    fail(`No notary key at ${key}: set DESKTOP_NOTARY_KEY_PATH.`);
  }

  console.log(`Building ${name} ${version}`);
  run(['bun', 'run', '--cwd', 'apps/desktop', 'build:macos'], { ...process.env, DESKTOP_VERSION: version });

  const temp = mkdtempSync(path.join(tmpdir(), 'desktop-release-'));
  const resources = path.join(app, 'Contents/Resources');
  const archive = readdirSync(resources).find((entry) => entry.endsWith('.tar.zst')) ?? fail(`No app archive in ${resources}`);

  run(['tar', '-xf', path.join(resources, archive), '-C', temp]);
  rmSync(app, { recursive: true, force: true });
  renameSync(path.join(temp, path.basename(app)), app);

  run(['security', 'unlock-keychain', '-p', password, keychain]);
  run(['/usr/libexec/PlistBuddy', '-c', `Add :CFBundleShortVersionString string ${version}`, path.join(app, 'Contents/Info.plist')]);

  const entitlementsFile = path.join(temp, 'entitlements.plist');

  writeFileSync(entitlementsFile, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>${entitlements.map((entitlement) => `<key>com.apple.security.cs.${entitlement}</key><true/>`).join('')}</dict></plist>
`);

  const sign = ['codesign', '--force', '--timestamp', '--options', 'runtime', '--keychain', keychain, '--sign', identity];
  const launcher = path.join(app, 'Contents/MacOS/launcher');
  const binaries = files(path.join(app, 'Contents')).filter((file) => file !== launcher && run(['file', '-b', file]).startsWith('Mach-O'));

  for (const file of binaries) {
    run([...sign, ...(file.endsWith('.dylib') ? [] : ['--entitlements', entitlementsFile]), file]);
  }

  run([...sign, '--entitlements', entitlementsFile, app]);
  run(['codesign', '--verify', '--deep', '--strict', app]);
  console.log('Signed');

  const zip = path.join(desktop, `artifacts/${name}-${version}-macos-arm64.zip`);

  run(['ditto', '-c', '-k', '--keepParent', app, zip]);

  const submitted = JSON.parse(run(['xcrun', 'notarytool', 'submit', zip, '--key', key, '--key-id', keyId, '--issuer', issuer, '--wait', '--output-format', 'json']));

  if (submitted.status !== 'Accepted') {
    fail(`Notarization ${submitted.status}: xcrun notarytool log ${submitted.id} --key ${key} --key-id ${keyId} --issuer ${issuer}`);
  }

  run(['xcrun', 'stapler', 'staple', app]);
  rmSync(zip);
  run(['ditto', '-c', '-k', '--keepParent', app, zip]);
  run(['spctl', '--assess', '--type', 'execute', app]);
  rmSync(temp, { recursive: true, force: true });

  // The in-app updater downloads the manifest Electrobun wrote and a bundle of this signed, stapled app under the same name.
  const manifest = JSON.parse(readFileSync(path.join(desktop, 'artifacts/stable-macos-arm64-update.json'), 'utf8'));
  const updateTar = path.join(desktop, 'artifacts', `${manifest.artifact.file}.tar`);

  run(['tar', '--no-mac-metadata', '-cf', updateTar, '-C', path.dirname(app), path.basename(app)], { ...process.env, COPYFILE_DISABLE: '1' });
  writeFileSync(path.join(desktop, 'artifacts', manifest.artifact.file), Bun.zstdCompressSync(readFileSync(updateTar)));
  rmSync(updateTar);
  console.log(`Notarized: ${zip}`);
}

const commands = { bundle, plist, release };

// Electrobun runs its postBuild hook without arguments, so a bare call inside a build is the plist step.
const command = process.argv[2] ?? (process.env.ELECTROBUN_BUILD_DIR ? 'plist' : '');

if (!(command in commands)) {
  fail('Usage: bun scripts/desktop.ts bundle | release (plist runs as the Electrobun postBuild hook)');
}

await commands[command as keyof typeof commands]();
