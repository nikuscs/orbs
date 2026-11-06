import { match, P } from 'ts-pattern';
import { runtimeCarry } from '../../types/runtime.types';
import { artifactContent, artifactDocument } from '../artifact/artifact.constants';
import { artifactContentKey } from '../artifact/artifact.utils';
import { noteDocument } from '../note/note.constants';
import { routineDocument } from '../routine/routine.constants';
import { todoDocument } from '../todo/todo.constants';
import { runtimeQueryConversation } from './runtime-query.conversation';
import type { RuntimeCarry, RuntimeServiceDeps } from '../../types/runtime.types';
import type { Context } from '@earendil-works/chord/context';

export async function runtimeQueryCarry(deps: RuntimeServiceDeps, context: Context): Promise<RuntimeCarry> {
  const { id } = await runtimeQueryConversation(deps, { botId: deps.botId, context });
  const routines = await deps.harness.snapshot(routineDocument, id, context);
  const artifacts = await deps.harness.snapshot(artifactDocument, id, context);
  const todos = await deps.harness.snapshot(todoDocument, id, context);
  const notes = await deps.harness.snapshot(noteDocument, context);

  const latest = await Promise.all(Object.values(artifacts?.artifacts ?? {}).map(async (artifact) => {
    const content = await deps.harness.snapshot(artifactContent, id, artifactContentKey(artifact.id, artifact.version), context);

    return match(content?.spec)
      .with(P.nonNullable, (spec) => [{ id: artifact.id, title: artifact.title, spec }])
      .otherwise(() => []);
  }));

  return runtimeCarry.parse({
    routines: Object.values(routines?.routines ?? {}).map((routine) => ({
      id: routine.id,
      name: routine.name,
      prompt: routine.prompt,
      schedule: routine.schedule,
      isEnabled: routine.isEnabled,
    })),
    artifacts: latest.flat(),
    todos: (todos?.todos ?? []).map((todo) => ({ id: todo.id, title: todo.title, isDone: todo.isDone })),
    notes: notes?.notes ?? [],
  });
}
