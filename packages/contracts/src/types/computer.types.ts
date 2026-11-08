import { z } from 'zod';
import { botGet } from './bot.types';

export const computerState = z.enum(['off', 'running', 'sleeping']);

export const computerControl = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  until: z.number().int(),
});

export const computerHandoff = z.object({
  conversationId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  choice: z.string(),
  until: z.number().int(),
});

export const computerStatus = z.object({
  botId: z.string(),
  state: computerState,
  startedAt: z.number().int().nullable(),
  lastActivityAt: z.number().int().nullable(),
  sleepsAt: z.number().int().nullable(),
  shutsDownAt: z.number().int().nullable(),
  control: computerControl.nullable(),
  handoff: computerHandoff.nullable(),
  thumbnailAt: z.number().int().nullable(),
});

export const computerThumbnail = z.object({
  data: z.string(),
  mimeType: z.string(),
  takenAt: z.number().int(),
  isLive: z.boolean(),
}).nullable();

export const computerViewerMode = z.enum(['watch', 'control']);

export const computerViewer = botGet.extend({ mode: computerViewerMode });

export const computerViewerResult = z.object({
  url: z.string(),
  expiresAt: z.number().int(),
});

export type ComputerState = z.infer<typeof computerState>;
export type ComputerControl = z.infer<typeof computerControl>;
export type ComputerHandoff = z.infer<typeof computerHandoff>;
export type ComputerStatus = z.infer<typeof computerStatus>;
export type ComputerThumbnail = z.infer<typeof computerThumbnail>;
export type ComputerViewerMode = z.infer<typeof computerViewerMode>;
export type ComputerViewerInput = z.infer<typeof computerViewer>;
export type ComputerViewerResult = z.infer<typeof computerViewerResult>;
