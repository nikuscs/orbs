import { ATTACHMENT } from '@repo/contracts/universal';
import { readdir, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { match } from 'ts-pattern';
import { attachmentStorageId } from '../../types/attachment-storage.types';
import { ATTACHMENT_STORAGE } from './attachment-storage.constants';
import { attachmentStorageDirectory } from './attachment-storage.utils';
import type { AttachmentStorageDeps, AttachmentStorageTarget } from '../../types/attachment-storage.types';
import type { Attachment } from '@repo/contracts/universal';

export async function attachmentStorageQueryStale({ root }: AttachmentStorageDeps, params: AttachmentStorageTarget): Promise<Attachment[]> {
  const directory = resolve(await realpath(root), 'agents', params.botId, '.attachments', String(params.conversationId));

  try {
    await attachmentStorageDirectory(directory);
    const entries = await readdir(directory, { withFileTypes: true });
    const ids = entries.filter((entry) => entry.isDirectory() && attachmentStorageId.safeParse(entry.name).success);

    const files = await Promise.all(ids.map(async ({ name: id }) => {
      const folder = resolve(directory, id);
      await attachmentStorageDirectory(folder);
      const children = await readdir(folder, { withFileTypes: true });
      return Promise.all(children.filter((child) => child.isFile() && child.name !== ATTACHMENT_STORAGE.posterName).map(async ({ name }) => {
        const info = await stat(resolve(folder, name));
        return match(info.mtimeMs + ATTACHMENT.pendingTtlMs <= Date.now())
          .with(true, () => ({ id, name, mediaType: 'application/octet-stream', size: info.size, createdAt: info.mtimeMs, isRetained: false }))
          .with(false, () => null)
          .exhaustive();
      }));
    }));

    return files.flat().filter((file) => file !== null);
  } catch (error) {
    return match(error)
      .with({ code: 'ENOENT' }, () => [])
      .otherwise(() => {
        throw error;
      });
  }
}
