import { Errors } from '@repo/errors/universal';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { dirname } from 'node:path';
import { match } from 'ts-pattern';
import { attachmentStorageDirectory, attachmentStoragePath, attachmentStorageRange, attachmentStorageReadFully } from './attachment-storage.utils';
import type { AttachmentStorageDeps, AttachmentStorageReadParams } from '../../types/attachment-storage.types';

export async function attachmentStorageQueryRead(deps: AttachmentStorageDeps, params: AttachmentStorageReadParams) {
  const path = await attachmentStoragePath(deps, params);

  try {
    await attachmentStorageDirectory(dirname(path));
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);

    try {
      const stat = await file.stat();
      match(stat.isFile() && stat.size === params.attachment.size)
        .with(true, () => undefined)
        .with(false, () => {
          throw new Errors.NOT_FOUND({ resource: 'attachment' });
        })
        .exhaustive();

      const range = attachmentStorageRange(params.range, stat.size);

      const [start, length] = match(range)
        .with({ kind: 'partial' }, (part) => [part.start, part.end - part.start + 1])
        .with({ kind: 'unsatisfiable' }, () => [0, 0])
        .with({ kind: 'full' }, () => [0, stat.size])
        .exhaustive();

      const bytes = new Uint8Array(length);

      await attachmentStorageReadFully(file, bytes, start);

      return {
        file: new File([bytes], params.attachment.name, { type: params.attachment.mediaType }),
        range,
        size: stat.size,
      };
    } finally {
      await file.close();
    }
  } catch (error) {
    return match(error)
      .with({ code: 'ENOENT' }, () => {
        throw new Errors.NOT_FOUND({ resource: 'attachment' });
      })
      .otherwise(() => {
        throw error;
      });
  }
}
