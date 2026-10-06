import { log } from '@orbs/logger/server';
import { STORAGE } from '#services/storage/storage.constants';
import type { RoomServiceDeps } from '#/types/room.types';

export function roomActionSweepFiles(deps: RoomServiceDeps): void {
  const cutoff = new Date(Date.now() - STORAGE.unsentTtlMs).toISOString();
  const { db } = deps.database;
  const prefix = `rooms/${deps.organizationId}/`;

  deps.database.run(db.deleteFrom('file').where('messageId', 'is', null).where('createdAt', '<', cutoff));

  async function roomSweepObjects(roomPrefix: string, roomId: string, cursor?: string): Promise<void> {
    const listed = await deps.storage.queries.list({ prefix: roomPrefix, cursor });
    const files = new Set(deps.database.all(db.selectFrom('file').select('id').where('roomId', '=', roomId)).map((file) => `${roomPrefix}${file.id}`));

    await deps.storage.actions.removeKeys({ keys: listed.keys.filter((key) => !files.has(key)) });

    if (listed.cursor) {
      await roomSweepObjects(roomPrefix, roomId, listed.cursor);
    }
  }

  async function roomSweepPrefixes(cursor?: string): Promise<void> {
    const listed = await deps.storage.queries.list({
      prefix,
      delimiter: '/',
      cursor,
    });

    await Promise.all(listed.prefixes.map(async (roomPrefix) => {
      const roomId = roomPrefix.slice(prefix.length, -1);
      const room = deps.database.all(db.selectFrom('room').select('id').where('id', '=', roomId)).at(0);

      if (room) {
        await roomSweepObjects(roomPrefix, roomId);
      } else {
        await deps.storage.actions.removeRoom({ organizationId: deps.organizationId, roomId });
      }
    }));

    if (listed.cursor) {
      await roomSweepPrefixes(listed.cursor);
    }
  }

  async function roomSweep(): Promise<void> {
    try {
      await roomSweepPrefixes();
    } catch (error) {
      log.error({
        tag: 'file',
        message: 'room file reconciliation failed',
        organizationId: deps.organizationId,
        error,
      });
    }
  }

  deps.waitUntil(roomSweep());
}
