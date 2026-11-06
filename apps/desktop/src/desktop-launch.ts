import { BuildConfig, PATHS } from 'electrobun/main';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { match } from 'ts-pattern';
import { DESKTOP_BUILD } from './desktop-build';
import { desktopProcessRuns } from './desktop-server';
import { desktopHome, desktopStateRead } from './desktop-settings';
import { DESKTOP } from './desktop.constants';

interface DesktopLaunchEntry {
  path: string;
  content: string;
}

const desktopLaunchSocket = () => join(desktopHome.root, DESKTOP.launch.socket);

/** Quotes an `Exec` argument per the Desktop Entry spec: a double quote, backtick or dollar sign gets a backslash, and a literal backslash takes four. */
const desktopLaunchExecArgument = (value: string) => `"${value.replaceAll('\\', '\\\\\\\\').replaceAll(/["`$]/gu, '\\$&')}"`;

/** Fixes the session the OS launched the app in, before the tray starts. */
export function desktopLaunchPrepare(): void {
  const uid = process.getuid?.();

  // AppIndicator reaches the tray over the session bus; GLib finds it through `$XDG_RUNTIME_DIR/bus`, so a launch without either variable gets the logind path `/run/user/<uid>/bus`.
  if (DESKTOP.platform === 'linux' && !process.env.DBUS_SESSION_BUS_ADDRESS && !process.env.XDG_RUNTIME_DIR && uid !== undefined) {
    process.env.DBUS_SESSION_BUS_ADDRESS = `unix:path=/run/user/${uid}/bus`;
  }
}

function desktopLaunchSignal(socket: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = connect(socket, () => {
      client.end();
      resolve(true);
    });

    client.on('error', () => resolve(false));
  });
}

/** Linux starts a new process per launch, so a connection to the running app's socket asks it to reopen. */
async function desktopLaunchSocketClaim(onReopen: () => void): Promise<boolean> {
  const socket = desktopLaunchSocket();

  if (await desktopLaunchSignal(socket)) {
    return false;
  }

  mkdirSync(desktopHome.root, { recursive: true, mode: 0o700 });
  rmSync(socket, { force: true });

  createServer(onReopen).listen(socket).unref();

  return true;
}

/** Claims the single app instance; a second launch asks the running one to reopen and gets `false`. */
export function desktopLaunchClaim(onReopen: () => void): Promise<boolean> {
  return match(DESKTOP.platform)
    // LaunchServices sends `reopen` itself, so only a login or headless launch beside a running app gets here.
    .with('macos', async () => !desktopProcessRuns(desktopStateRead().appPid, PATHS.RESOURCES_FOLDER))
    .with('linux', () => desktopLaunchSocketClaim(onReopen))
    .exhaustive();
}

export function desktopLaunchRelease(): void {
  if (DESKTOP.platform === 'linux') {
    rmSync(desktopLaunchSocket(), { force: true });
  }
}

function desktopLaunchEntry(): DesktopLaunchEntry {
  const label = `${DESKTOP_BUILD.identifier}.login.${BuildConfig.getSync().channel}`;

  return match(DESKTOP.platform)
    .with('macos', () => {
      const launcher = join(PATHS.RESOURCES_FOLDER, '..', 'MacOS', 'launcher').replaceAll('&', '&amp;').replaceAll('<', '&lt;');

      return {
        path: join(homedir(), 'Library/LaunchAgents', `${label}.plist`),
        content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array><string>${launcher}</string></array>
  <key>EnvironmentVariables</key><dict><key>${DESKTOP.launch.loginEnv}</key><string>1</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
`,
      };
    })
    .with('linux', () => {
      const icon = join(PATHS.RESOURCES_FOLDER, DESKTOP.launch.icon);

      return {
        path: join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'autostart', `${label}.desktop`),
        content: `[Desktop Entry]
Type=Application
Name=${DESKTOP_BUILD.name}
Exec=env ${DESKTOP.launch.loginEnv}=1 ${desktopLaunchExecArgument(join(dirname(process.execPath), 'launcher'))}
${existsSync(icon) ? `Icon=${icon}\n` : ''}Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
`,
      };
    })
    .exhaustive();
}

export function desktopLaunchAtLogin(): boolean {
  return existsSync(desktopLaunchEntry().path);
}

export function desktopLaunchAtLoginSet(enabled: boolean): void {
  const { path, content } = desktopLaunchEntry();

  if (!enabled) {
    rmSync(path, { force: true });
    return;
  }

  if (existsSync(path) && readFileSync(path, 'utf8') === content) {
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
