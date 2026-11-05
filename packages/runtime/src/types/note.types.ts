import { z } from 'zod';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export interface Note extends PiDurableTypes.JsonObject {
  key: string;
  text: string;
  updatedAt: number;
}

export interface NoteDocument extends PiDurableTypes.JsonObject {
  notes: Note[];
}

export const noteSaveInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    text: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('remove'),
    key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  }),
]);

export type NoteSaveInput = z.infer<typeof noteSaveInput>;

export type NoteApi = Pick<PiDurableTypes.ToolExecutionApi, 'commit'>;

export interface NoteSaveCall {
  input: NoteSaveInput;
  api: NoteApi;
  context: Context;
}
