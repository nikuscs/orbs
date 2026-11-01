import { attachmentStore } from './attachment.utils';
import type { AttachmentSendParams, AttachmentServiceDeps } from '../../types/attachment.types';

export async function attachmentActionSend(deps: AttachmentServiceDeps, params: AttachmentSendParams) {
  const conversationId = await deps.runtime.queries.attachmentTarget({ botId: params.botId });
  const file = await deps.storage.queries.source(params);

  return attachmentStore(deps, {
    target: { botId: params.botId, conversationId },
    file,
    isRetained: true,
  });
}
