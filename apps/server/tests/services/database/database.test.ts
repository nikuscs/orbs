import { describe, expect, onTestFinished, test } from 'vitest';
import { createTestTenant } from '../../support/database';

const ROOM = {
  id: 'room',
  kind: 'group',
  name: 'Room',
  memberKey: '',
  leaderBotId: null,
  stoppedThrough: null,
  position: null,
  createdAt: '2026-10-03T00:00:00.000Z',
} as const;

function tenant() {
  const testTenant = createTestTenant();
  onTestFinished(() => testTenant.close());

  return testTenant.database;
}

describe('makeDatabaseDurableService', () => {
  test('applies every tenant migration once', () => {
    const database = tenant();

    database.migrate();
    database.run(database.db.insertInto('room').values(ROOM));

    expect(database.all(database.db
      .selectFrom('room')
      .select(['id', 'pinned', 'description']))).toEqual([{ id: 'room', pinned: 0, description: '' }]);
    expect(database.all(database.db
      .selectFrom('reaction')
      .select('id'))).toEqual([]);
  });

  test('rolls back a transaction that throws', () => {
    const database = tenant();

    expect(() => database.transaction(() => {
      database.run(database.db.insertInto('room').values(ROOM));
      throw new RangeError('stop');
    })).toThrow(RangeError);

    expect(database.all(database.db
      .selectFrom('room')
      .select('id'))).toEqual([]);
  });
});
