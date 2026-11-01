import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { DESKTOP } from './desktop.constants';
import type { DesktopOpenMedia } from './types/desktop.types';

/** Writes a video the app's Chromium cannot decode to a private temporary folder and opens it in QuickTime, never in whatever app claims the file type. Each open replaces the previous copy. */
export async function desktopMediaOpen({ name, data }: DesktopOpenMedia): Promise<void> {
  const root = join(tmpdir(), DESKTOP.media.folder);
  const folder = join(root, randomUUID());
  const base = basename(name);
  const file = join(folder, base === '.' || base === '..' || base === '' ? DESKTOP.media.fallbackName : base);

  rmSync(root, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  await Bun.write(file, Buffer.from(data, 'base64'), { mode: 0o600 });
  Bun.spawn([DESKTOP.media.open, '-a', DESKTOP.media.player, file], { stdout: 'ignore', stderr: 'ignore' });
}
