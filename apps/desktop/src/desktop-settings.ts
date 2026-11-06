import { m } from '@repo/i18n/client';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { match } from 'ts-pattern';
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

async function desktopSettingsRun(command: string[]): Promise<{ output: string; error: string; exitCode: number }> {
  const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe' });

  const [output, error, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  return { output: output.trim(), error: error.trim(), exitCode };
}

/** Asks for a custom host in a native dialog; `null` means cancelled. */
export async function desktopSettingsPrompt(host: string): Promise<string | null> {
  return match(DESKTOP.platform)
    .with('macos', async () => {
      const { output, error, exitCode } = await desktopSettingsRun([
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
      ]);

      if (exitCode !== 0) {
        throw new Error(error);
      }

      return output || null;
    })
    .with('linux', async () => {
      const zenity = Bun.which('zenity');

      if (!zenity) {
        throw new Error(m.desktop_error_prompt());
      }

      const { output, error, exitCode } = await desktopSettingsRun([zenity, '--entry', `--title=${DESKTOP_BUILD.name}`, `--text=${m.desktop_network_custom()}`, `--entry-text=${host}`]);

      // zenity exits 0 on OK and 1 on Cancel; anything else is a failure.
      return match(exitCode)
        .with(0, () => output || null)
        .with(1, () => null)
        .otherwise(() => {
          throw new Error(error);
        });
    })
    .exhaustive();
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
