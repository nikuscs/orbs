import { m } from '@repo/i18n/client';
import { BuildConfig, PATHS } from 'electrobun/main';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DESKTOP_BUILD } from './desktop-build';
import { DESKTOP } from './desktop.constants';
import { desktopSettings, desktopState } from './types/desktop.types';
import type { DesktopSettings, DesktopState } from './types/desktop.types';

const desktopDataDir = process.env.DATA_DIR ?? DESKTOP.dataDir;

export const desktopHome = { root: resolve(desktopDataDir.replace(/^~(?=\/|$)/u, homedir())) };

export function desktopSettingsRead(): DesktopSettings {
  const { network = 'all', host } = desktopStateRead();

  return desktopSettings.safeParse({ network, host }).data ?? { network: 'all' };
}

export function desktopSettingsWrite(settings: DesktopSettings): void {
  desktopStateWrite({ network: settings.network, host: settings.network === 'custom' ? settings.host : undefined });
}

export async function desktopSettingsPrompt(host: string): Promise<string | null> {
  // macOS uses AppleScript (osascript) to display a native Cocoa input dialog.
  if (DESKTOP.isDarwin) {
    const child = Bun.spawn([
      '/usr/bin/osascript', '-e', `on run argv
        try
          activate
          set answer to display dialog (item 1 of argv) with title (item 5 of argv) default answer (item 2 of argv) buttons {item 3 of argv, item 4 of argv} default button 2 cancel button 1
          return text returned of answer
        on error number -128
          return
        end try
      end run`,
      m.desktop_network_custom(), host, m.desktop_cancel(), m.desktop_save(), DESKTOP_BUILD.name,
    ], { stdout: 'pipe', stderr: 'pipe' });

    const [output, error, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);

    if (exitCode !== 0) {
      throw new Error(error.trim());
    }

    return output.trim() || null;
  }

  // Linux uses Zenity (GNOME dialog utility) when available to show a native input dialog.
  const zenity = Bun.which('zenity');

  if (zenity) {
    const child = Bun.spawn([
      zenity,
      '--entry',
      `--title=${DESKTOP_BUILD.name}`,
      `--text=${m.desktop_network_custom()}`,
      `--entry-text=${host}`,
    ], { stdout: 'pipe', stderr: 'ignore' });

    const [output, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      child.exited,
    ]);

    return exitCode === 0 ? output.trim() || null : null;
  }

  return null;
}

export function desktopStateRead(): DesktopState {
  try {
    return desktopState.safeParse(JSON.parse(readFileSync(join(desktopHome.root, DESKTOP.stateFile), 'utf8'))).data ?? {};
  } catch {
    return {};
  }
}

export function desktopStateWrite(patch: Partial<DesktopState>): void {
  mkdirSync(desktopHome.root, { recursive: true, mode: 0o700 });
  writeFileSync(join(desktopHome.root, DESKTOP.stateFile), JSON.stringify({ ...desktopStateRead(), ...patch }, null, 2));
}

function desktopLoginPath(): string {
  // macOS uses LaunchAgents plist files; Linux uses standard FreeDesktop XDG autostart desktop entries.
  if (DESKTOP.isDarwin) {
    return join(homedir(), DESKTOP.login.agents, `${DESKTOP_BUILD.identifier}.login.${BuildConfig.getSync().channel}.plist`);
  }

  return join(homedir(), '.config/autostart', `${DESKTOP_BUILD.identifier}.desktop`);
}

/** macOS launchd service definition to launch Orbs at user login. */
function desktopLoginPlist(): string {
  const launcher = join(PATHS.RESOURCES_FOLDER, '..', 'MacOS', 'launcher').replaceAll('&', '&amp;').replaceAll('<', '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${DESKTOP_BUILD.identifier}.login.${BuildConfig.getSync().channel}</string>
  <key>ProgramArguments</key><array><string>${launcher}</string></array>
  <key>EnvironmentVariables</key><dict><key>${DESKTOP.login.env}</key><string>1</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
`;
}

/** Linux XDG desktop entry to autostart Orbs at user login. */
function desktopLoginDesktop(): string {
  const icon = join(PATHS.RESOURCES_FOLDER, 'appIcon.png');

  return `[Desktop Entry]
Type=Application
Name=${DESKTOP_BUILD.name}
Exec=${process.execPath}
Icon=${existsSync(icon) ? icon : 'appIcon'}
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
`;
}

export function desktopLoginEnabled(): boolean {
  return existsSync(desktopLoginPath());
}

export function desktopLoginSet(enabled: boolean): void {
  const path = desktopLoginPath();

  if (!enabled) {
    rmSync(path, { force: true });
    return;
  }

  const content = DESKTOP.isDarwin ? desktopLoginPlist() : desktopLoginDesktop();

  if (existsSync(path) && readFileSync(path, 'utf8') === content) {
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
