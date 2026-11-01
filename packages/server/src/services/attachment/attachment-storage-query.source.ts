import { getAgentDir } from '@earendil-works/pi-coding-agent';
import { ATTACHMENT } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { match, P } from 'ts-pattern';
import { attachmentStorageReadFully } from './attachment-storage.utils';
import { attachmentName } from './attachment.utils';
import type { AttachmentStorageDeps } from '../../types/attachment-storage.types';
import type { AttachmentSendParams } from '../../types/attachment.types';

export async function attachmentStorageQuerySource({ root }: AttachmentStorageDeps, params: AttachmentSendParams) {
  const base = await realpath(root);

  const path = await realpath(resolve(base, 'agents', params.botId, params.path)).catch((error: unknown) => match(error)
    .with({ code: P.union('ENOENT', 'ENOTDIR') }, () => {
      throw new Errors.NOT_FOUND({ resource: 'file' });
    })
    .otherwise(() => {
      throw error;
    }));

  const protectedPaths = await Promise.all([resolve(base, 'data'), getAgentDir()].map((item) => realpath(item).catch(() => resolve(item))));

  const isProtected = protectedPaths.some((item) => {
    const inner = relative(item, path);
    return !isAbsolute(inner) && inner.split(sep)[0] !== '..';
  });

  const mediaType = Object.entries(ATTACHMENT.sendTypes).find(([extension]) => `.${extension}` === extname(path).toLowerCase())?.[1];

  const type = match({ isProtected, mediaType })
    .with({ isProtected: true }, () => {
      throw new Errors.FORBIDDEN();
    })
    .with({ mediaType: P.string }, ({ mediaType: value }) => value)
    .otherwise(() => {
      throw new Errors.VALIDATION_ERROR({ fields: { path: { message: 'validation_file_type' } } });
    });

  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);

  try {
    const [info, current] = await Promise.all([
      file.stat(),
      stat(path),
    ]);

    match(info)
      .when((opened) => !opened.isFile() || opened.dev !== current.dev || opened.ino !== current.ino, () => {
        throw new Errors.FORBIDDEN();
      })
      .when((opened) => opened.size === 0 || opened.size > ATTACHMENT.sendMaxBytes, () => {
        throw new Errors.VALIDATION_ERROR({ fields: { path: { message: 'validation_file_size' } } });
      })
      .otherwise(() => undefined);

    const bytes = new Uint8Array(info.size);
    await attachmentStorageReadFully(file, bytes, 0);

    return new File([bytes], attachmentName(basename(path)), { type });
  } finally {
    await file.close();
  }
}
