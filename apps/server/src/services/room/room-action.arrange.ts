import type { RoomActionArrangeParams, RoomServiceDeps } from '#/types/room.types';

export function roomActionArrange(deps: RoomServiceDeps, params: RoomActionArrangeParams): void {
  const { db } = deps.database;
  const placed = params.placed.filter((id) => !params.pinned.includes(id));

  deps.database.transaction(() => {
    deps.database.run(db
      .updateTable('room')
      .set({ pinned: 0, position: null }));

    for (const [position, id] of params.pinned.entries()) {
      deps.database.run(db
        .updateTable('room')
        .set({ pinned: 1, position })
        .where('id', '=', id));
    }

    for (const [position, id] of placed.entries()) {
      deps.database.run(db
        .updateTable('room')
        .set({ position })
        .where('id', '=', id));
    }
  });
  deps.sockets.broadcast({ type: 'rooms.arranged' });
}
