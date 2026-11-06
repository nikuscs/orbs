import { defineExtension, defineTool, section } from '@earendil-works/pi-durable';
import * as m from '@repo/i18n/messages';
import { noteSaveInput, noteSaveParameters } from '../../types/note.types';
import { noteActionSave } from './note-action.save';
import { NOTE, noteDocument } from './note.constants';

export function makeNoteExtensionService() {
  const botNote = defineTool({
    name: NOTE.tool,
    description: m.ui_tool_bot_note_description(),
    parameters: noteSaveParameters,
    replay: 'unsafe',
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

  return { extension };
}

export type NoteExtensionService = ReturnType<typeof makeNoteExtensionService>;
