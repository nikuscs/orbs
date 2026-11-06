import { Type } from '@earendil-works/pi-ai';
import { z } from 'zod';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

const noteKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const noteText = z.string().min(1).max(500);

export interface Note extends PiDurableTypes.JsonObject {
  key: string;
  text: string;
  updatedAt: number;
}

export interface NoteDocument extends PiDurableTypes.JsonObject {
  notes: Note[];
}

export const note = z.object({
  key: noteKey,
  text: noteText,
  updatedAt: z.number(),
});

export const noteSaveInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    key: noteKey,
    text: noteText,
  }),
  z.object({ action: z.literal('remove'), key: noteKey }),
]);

const noteSaveFields = z.object({
  action: z.enum(['save', 'remove']),
  key: noteKey,
  text: noteText.optional(),
}).strict();

export const noteSaveParameters = Type.Unsafe<z.infer<typeof noteSaveFields>>(
  z.toJSONSchema(noteSaveFields, { io: 'input' }),
);

export type NoteSaveInput = z.infer<typeof noteSaveInput>;

export type NoteApi = Pick<PiDurableTypes.ToolExecutionApi, 'commit'>;

export interface NoteSaveCall {
  input: NoteSaveInput;
  api: NoteApi;
  context: Context;
}
