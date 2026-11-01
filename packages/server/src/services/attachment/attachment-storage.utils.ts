import { Errors } from '@repo/errors/universal';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { match, P } from 'ts-pattern';
import type { AttachmentStorageDeps, AttachmentStorageParams, AttachmentStorageRange } from '../../types/attachment-storage.types';
import type { FileHandle } from 'node:fs/promises';

export async function attachmentStoragePath({ root }: AttachmentStorageDeps, { botId, conversationId, attachment }: AttachmentStorageParams) {
  return resolve(await realpath(root), 'agents', botId, '.attachments', String(conversationId), attachment.id, attachment.name);
}

export async function attachmentStorageDirectory(path: string) {
  const actual = await realpath(path);
  match(actual === resolve(path))
    .with(true, () => undefined)
    .with(false, () => {
      throw new Errors.FORBIDDEN();
    })
    .exhaustive();
}

export function attachmentStorageRange(header: string | undefined, size: number): AttachmentStorageRange {
  const parsed = /^bytes=(\d*)-(\d*)$/u.exec(header?.trim() ?? '');
  const first = parsed?.[1] ?? '';
  const last = parsed?.[2] ?? '';

  return match({
    parsed,
    first,
    last,
  })
    .returnType<AttachmentStorageRange>()
    .with({ parsed: P.nullish }, { first: '', last: '' }, () => ({ kind: 'full' }))
    .with({ first: '' }, () => (Number(last) === 0 ? { kind: 'unsatisfiable' } : { kind: 'partial', start: Math.max(0, size - Number(last)), end: size - 1 }))
    .when(() => Number(first) >= size, () => ({ kind: 'unsatisfiable' }))
    .with({ last: '' }, () => ({ kind: 'partial', start: Number(first), end: size - 1 }))
    .when(() => Number(last) < Number(first), () => ({ kind: 'full' }))
    .otherwise(() => ({ kind: 'partial', start: Number(first), end: Math.min(Number(last), size - 1) }));
}

export async function attachmentStorageReadFully(file: FileHandle, bytes: Uint8Array, start: number, offset = 0): Promise<void> {
  if (offset === bytes.length) {
    return;
  }

  const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, start + offset);

  if (bytesRead === 0) {
    throw new Errors.NOT_FOUND({ resource: 'file' });
  }

  await attachmentStorageReadFully(file, bytes, start, offset + bytesRead);
}
