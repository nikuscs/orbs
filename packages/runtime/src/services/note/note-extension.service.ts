import { Type } from '@earendil-works/pi-ai';
import { defineExtension, defineTool, section } from '@earendil-works/pi-durable';
import * as m from '@repo/i18n/messages';
import { noteSaveInput } from '../../types/note.types';
import { noteActionSave } from './note-action.save';
import { NOTE, noteDocument } from './note.constants';
import type { NoteSaveCall } from '../../types/note.types';

export function makeNoteExtensionService() {
  const botNote = defineTool({
    name: NOTE.tool,
    description: m.ui_tool_bot_note_description(),
    parameters: Type.Object({
      action: Type.Union([Type.Literal('save'), Type.Literal('remove')]),
      key: Type.String({
        minLength: 1,
        maxLength: NOTE.maxKey,
        pattern: '^[a-z0-9][a-z0-9-]{0,63}$',
      }),
      text: Type.Optional(Type.String({ minLength: 1, maxLength: NOTE.maxText })),
    }),
    replay: 'safe',
    execute: (params, api, context) => noteActionSave({
      input: noteSaveInput.parse(params),
      api,
      context,
    }),
  });

  const extension = defineExtension({
    name: NOTE.extension,
    sections: [section('notes', async (input, context) => {
      const doc = await input.read.snapshot(noteDocument, context);
      const lines = (doc?.notes ?? []).map((note) => `- ${note.key}: ${note.text}`);

      return lines.length === 0 ? undefined : [m.ui_note_prompt(), ...lines].join('\n');
    })],
    tools: [botNote],
  });

  return { extension, save: (call: NoteSaveCall) => noteActionSave(call) };
}

export type NoteExtensionService = ReturnType<typeof makeNoteExtensionService>;
