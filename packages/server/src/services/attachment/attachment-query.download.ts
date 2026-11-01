import type { AttachmentDownloadParams, AttachmentServiceDeps } from '../../types/attachment.types';

export async function attachmentQueryDownload({ runtime, storage }: AttachmentServiceDeps, params: AttachmentDownloadParams) {
  const { conversationId, attachment } = await runtime.queries.attachment(params);
  return storage.queries.read({
    botId: params.botId,
    conversationId,
    attachment,
    range: params.range,
  });
}
