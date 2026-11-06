import { match, P } from 'ts-pattern';
import { runtimeCarry } from '../../types/runtime.types';
import { noteDocument } from '../note/note.constants';
import type { RuntimeCarryOverDeps, RuntimeCarryOverParams, RuntimeContextInput } from '../../types/runtime.types';

export async function runtimeActionCarryOver(deps: RuntimeCarryOverDeps, { conversationId, context }: RuntimeCarryOverParams & RuntimeContextInput) {
  const saved = await deps.storage.readCarry({ botId: deps.botId });

  await match(saved)
    .with(P.nonNullable, async (value) => {
      const carry = runtimeCarry.parse(value);

      await Promise.all(carry.routines.map((routine) => deps.routines.actions.create({
        ...routine,
        botId: deps.botId,
        conversationId,
      }, context)));
      await Promise.all(carry.artifacts.map((artifact) => deps.artifacts.actions.create({
        ...artifact,
        botId: deps.botId,
        conversationId,
      }, context)));
      await Promise.all(carry.todos.map((todo) => deps.todos.actions.create({ ...todo, conversationId }, context)));
      await deps.todos.actions.reorder({ conversationId, todoIds: carry.todos.map((todo) => todo.id) }, context);
      await deps.harness.commit(async (tx) => {
        const doc = await tx.doc(noteDocument);
        doc.notes = carry.notes;
      }, context);
      await deps.storage.removeCarry({ botId: deps.botId });
    })
    .otherwise(() => undefined);
}
