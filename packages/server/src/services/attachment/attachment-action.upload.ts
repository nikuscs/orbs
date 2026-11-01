import { attachmentActionSweep } from './attachment-action.sweep';
import { attachmentStore } from './attachment.utils';
import type { AttachmentServiceDeps } from '../../types/attachment.types';
import type { AttachmentUploadInput } from '@repo/contracts/universal';

export async function attachmentActionUpload(deps: AttachmentServiceDeps, params: AttachmentUploadInput) {
  await deps.bots.queries.get({ botId: params.botId });
  const conversationId = await deps.runtime.queries.attachmentTarget(params);
  const target = { botId: params.botId, conversationId };
  await attachmentActionSweep(deps, target);

  return attachmentStore(deps, {
    target,
    file: params.file,
    isRetained: false,
  });
}
