import { Updater } from 'electrobun/main';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DESKTOP } from './desktop.constants';
import { desktopUpdatePrepared } from './types/desktop.types';
import type { DesktopUpdateState } from './types/desktop.types';

let state: DesktopUpdateState = { status: 'idle', version: '' };
let running: Promise<DesktopUpdateState> | null = null;
let listener: (next: DesktopUpdateState) => void = () => undefined;

function desktopUpdateSet(next: Partial<DesktopUpdateState>): DesktopUpdateState {
  state = { ...state, ...next };
  listener(state);

  return state;
}

function desktopUpdateTeam(app: string): string | null {
  const result = Bun.spawnSync([DESKTOP.update.codesign, '-dv', app], { stdout: 'pipe', stderr: 'pipe' });
  const line = result.stderr.toString().split('\n').find((entry) => entry.startsWith(DESKTOP.update.teamIdPrefix));
  const team = line?.slice(DESKTOP.update.teamIdPrefix.length).trim();

  return result.exitCode === 0 && team && team !== 'not set' ? team : null;
}

/** Electrobun checks only the release identity and build hash, so the downloaded app must also be signed by the same team and accepted by Gatekeeper. */
async function desktopUpdateVerify(): Promise<boolean> {
  const prepared = desktopUpdatePrepared.safeParse(JSON.parse(readFileSync(join(await Updater.appDataFolder(), DESKTOP.update.preparedFile), 'utf8')));
  const team = desktopUpdateTeam(resolve(dirname(process.execPath), '..', '..'));

  if (!prepared.success || !team) {
    return false;
  }

  const folder = mkdtempSync(join(tmpdir(), 'desktop-update-'));

  try {
    const unpacked = Bun.spawnSync([DESKTOP.update.tar, '-xf', prepared.data.retained_tar_path, '-C', folder]);
    const app = readdirSync(folder).find((entry) => entry.endsWith('.app'));

    if (unpacked.exitCode !== 0 || !app) {
      return false;
    }

    const path = join(folder, app);

    return Bun.spawnSync([DESKTOP.update.codesign, '--verify', '--deep', '--strict', path]).exitCode === 0
      && Bun.spawnSync([DESKTOP.update.spctl, '--assess', '--type', 'execute', path]).exitCode === 0
      && desktopUpdateTeam(path) === team;
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

async function desktopUpdateRun(): Promise<DesktopUpdateState> {
  if (state.status === 'ready') {
    return state;
  }

  desktopUpdateSet({ status: 'checking' });

  try {
    const found = await Updater.checkForUpdate();

    if (!found.updateAvailable) {
      return desktopUpdateSet({ status: 'current' });
    }

    desktopUpdateSet({ status: 'downloading' });
    await Updater.downloadUpdate();

    if (!Updater.updateInfo().updateReady || !await desktopUpdateVerify()) {
      return desktopUpdateSet({ status: 'error' });
    }

    return desktopUpdateSet({ status: 'ready', available: found.version });
  } catch {
    return desktopUpdateSet({ status: 'error' });
  }
}

export function desktopUpdateState(): DesktopUpdateState {
  return state;
}

/** Checks, downloads and verifies one update; concurrent calls share the same run. */
export function desktopUpdateCheck(): Promise<DesktopUpdateState> {
  running ??= desktopUpdateRun().finally(() => {
    running = null;
  });

  return running;
}

/** Only packaged stable builds update; dev and canary builds keep their own version. */
export async function desktopUpdateStart(onChange: (next: DesktopUpdateState) => void): Promise<boolean> {
  const { channel, version } = await Updater.getLocalInfo();

  if (channel !== DESKTOP.update.channel) {
    return false;
  }

  listener = onChange;
  desktopUpdateSet({ version });
  setTimeout(() => void desktopUpdateCheck(), DESKTOP.update.firstCheckMs);
  setInterval(() => void desktopUpdateCheck(), DESKTOP.update.intervalMs);

  return true;
}

/** Swaps in the verified update and relaunches; the caller stops the local server first. */
export function desktopUpdateApply(): Promise<void> {
  return Updater.applyUpdate();
}
