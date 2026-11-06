import { z } from 'zod';
import { replyQuote } from './reply.types';

export const ATTACHMENT = {
  entryKind: 'bots.attachment-message',
  maxBytes: 10 * 1024 * 1024,
  maxPerMessage: 4,
  pendingTtlMs: 24 * 60 * 60 * 1000,
  mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'],
  sendToolName: 'bot_send_file',
  sendMaxBytes: 50 * 1024 * 1024,
  sendTypes: {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    aac: 'audio/aac',
  },
} as const;

export const attachmentTarget = z.object({
  botId: z.uuid(),
  conversationId: z.number().int().positive().optional(),
});

export const attachment = z.object({
  id: z.uuid(),
  name: z.string(),
  mediaType: z.string(),
  size: z.number().int().positive(),
  createdAt: z.number().int(),
  isRetained: z.boolean(),
});

export const attachmentUpload = attachmentTarget.extend({
  file: z.file().min(1).max(ATTACHMENT.maxBytes).refine((file) => (
    ATTACHMENT.mediaTypes.some((mediaType) => mediaType === file.type.split(';', 1)[0]?.trim())
  )),
});

export const attachmentGet = attachmentTarget.extend({ attachmentId: z.uuid() });
export const attachmentDownload = z.file();
export const attachmentRemoveResult = z.void();

export const attachmentList = attachmentTarget.extend({
  before: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const attachmentPage = z.object({ items: z.array(attachment), next: z.uuid().optional() });
export const attachmentIds = z.array(z.uuid()).max(ATTACHMENT.maxPerMessage).refine((ids) => new Set(ids).size === ids.length);

export const attachmentSent = z.object({ attachment });

export const attachmentView = z.object({ entryId: z.number().int().positive().optional() });

export const attachmentMessage = z.object({
  content: z.string(),
  attachments: z.array(attachment),
  replyTo: replyQuote.optional(),
  skills: z.array(z.string()).optional(),
});

export type Attachment = z.infer<typeof attachment>;
export type AttachmentTarget = z.infer<typeof attachmentTarget>;
export type AttachmentUploadInput = z.infer<typeof attachmentUpload>;
export type AttachmentGetInput = z.infer<typeof attachmentGet>;
export type AttachmentListInput = z.infer<typeof attachmentList>;
export type AttachmentMessage = z.infer<typeof attachmentMessage>;
