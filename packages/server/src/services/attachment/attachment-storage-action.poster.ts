import { log } from '@repo/logger/server';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, unlink } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { ATTACHMENT_STORAGE } from './attachment-storage.constants';
import { attachmentStorageDirectory, attachmentStoragePath, attachmentStoragePosterPath } from './attachment-storage.utils';
import type { AttachmentStorageDeps, AttachmentStorageParams } from '../../types/attachment-storage.types';

export async function attachmentStorageActionPoster(deps: AttachmentStorageDeps, params: AttachmentStorageParams) {
  const directories = [...(process.env.PATH ?? '').split(delimiter), ...ATTACHMENT_STORAGE.ffmpegDirectories].filter(Boolean);
  const ffmpeg = directories.flatMap((directory) => ATTACHMENT_STORAGE.ffmpegNames.map((name) => join(directory, name))).find((path) => existsSync(path));

  if (!ffmpeg) {
    return;
  }

  const path = await attachmentStoragePath(deps, params);
  const poster = attachmentStoragePosterPath(path);

  try {
    await attachmentStorageDirectory(dirname(path));
    await promisify(execFile)(ffmpeg, [
      '-nostdin',
      '-loglevel', 'error',
      '-i', path,
      '-vf', `thumbnail,scale='min(${String(ATTACHMENT_STORAGE.posterWidth)},iw)':-2`,
      '-frames:v', '1',
      '-q:v', '4',
      '-y', poster,
    ], { timeout: ATTACHMENT_STORAGE.posterTimeoutMs });
    await chmod(poster, 0o600);
  } catch (error) {
    await unlink(poster).catch(() => undefined);
    log.debug({
      tag: 'attachment',
      message: 'Video poster could not be made',
      error,
    });
  }
}
