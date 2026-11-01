import type { AttachmentServiceDeps, AttachmentStoreParams } from '../../types/attachment.types';

export function attachmentName(name: string): string {
  const cleaned = name.normalize('NFC').replace(/[\p{Cc}/\\]/gu, '_').replace(/^\.+/, '_');
  const bytes = new TextEncoder().encode(cleaned).slice(0, 200);
  return new TextDecoder().decode(bytes).replace(/�$/u, '') || 'file';
}

export async function attachmentStore({ runtime, storage }: AttachmentServiceDeps, { target, file, isRetained }: AttachmentStoreParams) {
  const attachment = {
    id: crypto.randomUUID(),
    name: attachmentName(file.name),
    mediaType: file.type.split(';', 1)[0]?.trim() ?? '',
    size: file.size,
    createdAt: Date.now(),
    isRetained,
  };

  await storage.actions.write({
    ...target,
    attachment,
    file,
  });

  try {
    await runtime.actions.addAttachment({ ...target, attachment });
    return attachment;
  } catch (error) {
    await storage.actions.remove({ ...target, attachment });
    throw error;
  }
}
