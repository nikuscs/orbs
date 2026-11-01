import { Type } from '@earendil-works/pi-ai';
import { z } from 'zod';
import type { RuntimeSharedDeps } from './runtime.types';
import type { Attachment } from '@repo/contracts/universal';

export const runtimeAttachmentToolsSend = z.object({ path: z.string().min(1) }).strict();

export const runtimeAttachmentToolsSendParameters = Type.Unsafe<z.infer<typeof runtimeAttachmentToolsSend>>(
  z.toJSONSchema(runtimeAttachmentToolsSend, { io: 'input' }),
);

export interface RuntimeAttachmentToolsSendParams {
  botId: string;
  path: string;
}

export interface RuntimeAttachmentToolsAttachments {
  actions: {
    send: (params: RuntimeAttachmentToolsSendParams) => Promise<Attachment>;
  };
}

export interface RuntimeAttachmentToolsRegisterParams {
  attachments: RuntimeAttachmentToolsAttachments;
}

export type RuntimeAttachmentToolsRegisterDeps = Pick<RuntimeSharedDeps, 'extensions'>;
