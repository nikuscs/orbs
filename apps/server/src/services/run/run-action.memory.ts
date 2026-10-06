import type { RunActionMemoryParams, RunServiceDeps } from '#/types/run.types';

export function runActionMemory(deps: RunServiceDeps, params: RunActionMemoryParams) {
  const rows = deps.database.all(
    deps.database.db
      .selectFrom('memorySnapshot')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([eb('scope', '=', 'global'), eb('ownerId', '=', '')]),
          eb.and([eb('scope', '=', 'bot'), eb('ownerId', '=', params.botId)]),
          eb.and([eb('scope', '=', 'room'), eb('ownerId', '=', params.roomId)]),
        ]),
      ),
  );

  for (const scope of [
    { scope: 'global' as const, ownerId: '' },
    { scope: 'bot' as const, ownerId: params.botId },
    { scope: 'room' as const, ownerId: params.roomId },
  ]) {
    if (!rows.some((row) => row.scope === scope.scope && row.ownerId === scope.ownerId)) {
      deps.database.run(
        deps.database.db
          .insertInto('memorySnapshot')
          .values({
            ...scope,
            text: '',
            dirty: 1,
            dueAt: Date.now(),
          })
          .onConflict((conflict) => conflict.columns(['scope', 'ownerId']).doNothing()),
      );
      deps.alarm.set(Date.now());
    }
  }

  return {
    sections: {
      global: rows.find((row) => row.scope === 'global' && row.dirty === 0)?.text ?? null,
      bot: rows.find((row) => row.scope === 'bot' && row.dirty === 0)?.text ?? null,
      room: rows.find((row) => row.scope === 'room' && row.dirty === 0)?.text ?? null,
    },
  };
}
