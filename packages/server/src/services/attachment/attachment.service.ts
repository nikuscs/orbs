import { attachmentActionRemove } from './attachment-action.remove';
import { attachmentActionSend } from './attachment-action.send';
import { attachmentActionUpload } from './attachment-action.upload';
import { attachmentQueryDownload } from './attachment-query.download';
import type * as AttachmentTypes from '../../types/attachment.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeAttachmentService(deps: AttachmentTypes.AttachmentServiceDeps) {
  return {
    actions: {
      upload: (params: UniversalTypes.AttachmentUploadInput) => attachmentActionUpload(deps, params),
      remove: (params: UniversalTypes.AttachmentGetInput) => attachmentActionRemove(deps, params),
      send: (params: AttachmentTypes.AttachmentSendParams) => attachmentActionSend(deps, params),
      prepare: (params: AttachmentTypes.AttachmentPrepareParams) => deps.runtime.actions.retainAttachments(params),
      clear: (params: UniversalTypes.BotGetInput) => deps.storage.actions.clear(params),
    },
    queries: {
      download: (params: AttachmentTypes.AttachmentDownloadParams) => attachmentQueryDownload(deps, params),
      list: (params: UniversalTypes.AttachmentListInput) => deps.runtime.queries.attachments(params),
    },
  };
}

export type AttachmentService = ReturnType<typeof makeAttachmentService>;
