import { z } from 'zod';
import type { Attachment } from '@repo/contracts/universal';

export interface AttachmentStorageDeps {
  root: string;
}

export interface AttachmentStorageParams {
  botId: string;
  conversationId: number;
  attachment: Attachment;
}

export interface AttachmentStorageReadParams extends AttachmentStorageParams {
  range?: string;
}

export type AttachmentStorageRange =
  | { kind: 'full' }
  | { kind: 'partial'; start: number; end: number }
  | { kind: 'unsatisfiable' };

export interface AttachmentStorageWriteParams extends AttachmentStorageParams {
  file: File;
}

export interface AttachmentStorageTarget {
  botId: string;
  conversationId: number;
}

export const attachmentStorageId = z.uuid();
