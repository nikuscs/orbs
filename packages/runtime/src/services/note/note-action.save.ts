import { Errors } from '@repo/errors/universal';
import { match } from 'ts-pattern';
import { NOTE, noteDocument } from './note.constants';
import type { NoteSaveCall } from '../../types/note.types';

export async function noteActionSave({ input, api, context }: NoteSaveCall) {
  const text = await api.commit(async (tx) => {
    const doc = await tx.doc(noteDocument);
    const existing = doc.notes.find((note) => note.key === input.key);

    return match(input)
      .with({ action: 'save' }, ({ key, text: noteText }) => {
        if (existing === undefined && doc.notes.length >= NOTE.maxNotes) {
          throw new Errors.CONFLICT({ internal: `You already have ${NOTE.maxNotes} notes. Remove or merge notes before saving a new one.` });
        }

        if (existing === undefined) {
          doc.notes.push({
            key,
            text: noteText,
            updatedAt: Date.now(),
          });
        } else {
          existing.text = noteText;
          existing.updatedAt = Date.now();
        }

        return `Saved note ${key}.`;
      })
      .with({ action: 'remove' }, ({ key }) => {
        doc.notes = doc.notes.filter((note) => note.key !== key);

        return match(existing)
          .with(undefined, () => `There is no note ${key}.`)
          .otherwise(() => `Removed note ${key}.`);
      })
      .exhaustive();
  }, context);

  return { output: [{ type: 'text' as const, text }] };
}
