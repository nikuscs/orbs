import type { MemoryStateActionRefreshParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateActionRefresh(deps: MemoryStateServiceDeps, params: MemoryStateActionRefreshParams): Promise<void> {
  const facts = await deps.memory.queries.snapshot({ organizationId: deps.organizationId, scope: params.scope });
  const text = deps.render(facts);

  deps.database.run(
    deps.database.db
      .insertInto('memorySnapshot')
      .values({
        ...params.scope,
        text,
        dirty: 0,
        dueAt: 0,
      })
      .onConflict((conflict) =>
        conflict.columns(['scope', 'ownerId']).doUpdateSet({
          text,
          dirty: 0,
          dueAt: 0,
        }),
      ),
  );
}
