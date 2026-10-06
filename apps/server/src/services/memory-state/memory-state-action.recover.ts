import { memoryScope } from '#/types/memory.types';
import { memoryStateActionRefresh } from './memory-state-action.refresh';
import type { MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateActionRecover(deps: MemoryStateServiceDeps): Promise<void> {
  const rows = deps.database.all(
    deps.database.db.selectFrom('memorySnapshot').selectAll().where('dirty', '=', 1).where('dueAt', '<=', Date.now()).limit(20),
  );

  await rows.reduce(async (previous, row) => {
    await previous;
    deps.database.run(
      deps.database.db
        .updateTable('memorySnapshot')
        .set({ dueAt: Date.now() + 30000 })
        .where('scope', '=', row.scope)
        .where('ownerId', '=', row.ownerId),
    );
    if (row.scope === 'room' && !deps.database.all(deps.database.db.selectFrom('room').select('id').where('id', '=', row.ownerId)).length) {
      await deps.memory.actions.removeRoom({ organizationId: deps.organizationId, roomId: row.ownerId });
      deps.database.run(deps.database.db.deleteFrom('memorySnapshot').where('scope', '=', 'room').where('ownerId', '=', row.ownerId));

      return;
    }

    await memoryStateActionRefresh(deps, { scope: memoryScope.parse({ scope: row.scope, ownerId: row.ownerId }) });
  }, Promise.resolve());
}
