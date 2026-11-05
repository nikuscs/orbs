import { defineDoc } from '@earendil-works/pi-durable';
import type { NoteDocument } from '../../types/note.types';

export const NOTE = {
  extension: 'bots.notes',
  tool: 'bot_note',
  maxNotes: 30,
  maxKey: 64,
  maxText: 500,
} as const;

export const noteDocument = defineDoc<NoteDocument>({
  kind: 'bots.notes',
  version: 1,
  scope: 'session',
  initial: () => ({ notes: [] }),
  checkpointWhen: () => false,
});
