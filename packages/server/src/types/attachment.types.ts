import type { AttachmentStorageService } from '../services/attachment/attachment-storage.service';
import type { BotService } from '../services/bot/bot.service';
import type { AttachmentStorageTarget } from './attachment-storage.types';
import type { AttachmentGetInput, AttachmentTarget } from '@repo/contracts/universal';
import type { RuntimeService } from '@repo/runtime/server';

export interface AttachmentServiceDeps {
  bots: BotService;
  runtime: RuntimeService;
  storage: AttachmentStorageService;
}

export interface AttachmentPrepareParams extends AttachmentTarget {
  attachmentIds: string[];
}

export interface AttachmentSendParams {
  botId: string;
  path: string;
}

export interface AttachmentStoreParams {
  target: AttachmentStorageTarget;
  file: File;
  isRetained: boolean;
}

export interface AttachmentDownloadParams extends AttachmentGetInput {
  range?: string;
}
