import { describe, expect } from 'vitest';
import { createMemoryKit } from '../../kits/memory.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ memory: createMemoryKit(testD1) }));

describe('scoped memory', () => {
  test('deduplicates identical facts and applies corrections with optimistic revisions', async ({ kit, make }) => {
    const org = await make.organization();

    const params = {
      organizationId: org.id,
      actorId: 'author',
      operationId: 'one',
      origin: 'manual' as const,
      scope: { scope: 'room' as const, ownerId: 'room' },
      subject: { kind: 'room' as const, id: 'room' },
      text: 'Use red for the website',
      sources: [],
    };

    const first = await kit.memory.actions.save(params);
    const duplicate = await kit.memory.actions.save({ ...params, operationId: 'two' });
    expect(duplicate).toEqual(first);

    const corrected = await kit.memory.actions.update({
      ...params,
      id: first.memoryId,
      operationId: 'three',
      expectedRevision: 1,
      text: 'Use green for the website',
    });

    expect(corrected.revision).toBe(2);
    await expect(
      kit.memory.actions.update({
        ...params,
        id: first.memoryId,
        operationId: 'four',
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const list = await kit.memory.queries.list({
      organizationId: org.id,
      scope: params.scope,
      query: '',
      limit: 30,
    });

    expect(list.items.map((row) => row.text)).toEqual(['Use green for the website']);
  });

  test('replays committed operations without resurrecting forgotten text and exports text-free tombstones', async ({ kit, make }) => {
    const org = await make.organization();

    const params = {
      organizationId: org.id,
      actorId: 'author',
      operationId: 'save',
      origin: 'manual' as const,
      scope: { scope: 'room' as const, ownerId: 'room' },
      subject: { kind: 'room' as const, id: 'room' },
      text: 'Use red',
      sources: [{ roomId: 'room', messageId: 'source-one', seq: 1, authorId: 'author' }],
    };

    const first = await kit.memory.actions.save(params);
    await kit.memory.actions.update({
      ...params,
      id: first.memoryId,
      expectedRevision: 1,
      operationId: 'update',
      text: 'Use green',
      sources: [{ roomId: 'room', messageId: 'source-two', seq: 2, authorId: 'author' }],
    });

    const forgotten = await kit.memory.actions.forget({
      ...params,
      id: first.memoryId,
      operationId: 'forget',
      expectedRevision: 2,
    });

    expect(await kit.memory.actions.save(params)).toEqual(first);
    expect(
      await kit.memory.actions.forget({
        ...params,
        id: first.memoryId,
        operationId: 'forget',
        expectedRevision: 2,
      }),
    ).toEqual(forgotten);
    const exported = await kit.memory.queries.export({ organizationId: org.id });
    expect(exported.items).toHaveLength(1);
    expect(exported.items[0]).toMatchObject({ text: null, revision: 3 });
    expect(exported.items[0]?.sources.map((source) => source.messageId)).toEqual(['source-one', 'source-two']);
    expect(JSON.stringify(exported)).not.toContain('Use red');
    expect(JSON.stringify(exported)).not.toContain('Use green');
  });

  test('isolates organizations, scopes and owners and rejects foreign fact updates', async ({ kit, make }) => {
    const firstOrg = await make.organization();
    const secondOrg = await make.organization();

    const params = {
      organizationId: firstOrg.id,
      actorId: 'author',
      operationId: 'one',
      origin: 'manual' as const,
      scope: { scope: 'room' as const, ownerId: 'first-room' },
      subject: { kind: 'room' as const, id: 'first-room' },
      text: 'Use green',
      sources: [],
    };

    const saved = await kit.memory.actions.save(params);
    expect(
      (
        await kit.memory.queries.list({
          organizationId: secondOrg.id,
          scope: params.scope,
          query: '',
          limit: 30,
        })
      ).items,
    ).toEqual([]);
    expect(
      (
        await kit.memory.queries.list({
          organizationId: firstOrg.id,
          scope: { scope: 'room', ownerId: 'other-room' },
          query: '',
          limit: 30,
        })
      ).items,
    ).toEqual([]);
    await expect(
      kit.memory.actions.forget({
        organizationId: secondOrg.id,
        scope: params.scope,
        id: saved.memoryId,
        expectedRevision: 1,
        operationId: 'forget',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      kit.memory.actions.forget({
        organizationId: firstOrg.id,
        scope: { scope: 'global', ownerId: '' },
        id: saved.memoryId,
        expectedRevision: 1,
        operationId: 'forget',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('treats search wildcards literally and promotes without creating a copy', async ({ kit, make }) => {
    const org = await make.organization();

    const params = {
      organizationId: org.id,
      actorId: 'author',
      operationId: 'one',
      origin: 'manual' as const,
      scope: { scope: 'room' as const, ownerId: 'room' },
      subject: { kind: 'room' as const, id: 'room' },
      text: 'Use green',
      sources: [],
    };

    const saved = await kit.memory.actions.save(params);
    expect(
      (
        await kit.memory.queries.list({
          ...params,
          query: '%',
          limit: 30,
        })
      ).items,
    ).toEqual([]);
    await kit.memory.actions.share({
      ...params,
      id: saved.memoryId,
      expectedRevision: 1,
      operationId: 'share',
      destination: { scope: 'global', ownerId: '' },
    });
    expect(
      (
        await kit.memory.queries.list({
          ...params,
          query: '',
          limit: 30,
        })
      ).items,
    ).toEqual([]);
    expect(
      (
        await kit.memory.queries.list({
          ...params,
          scope: { scope: 'global', ownerId: '' },
          query: '',
          limit: 30,
        })
      ).items[0]?.id,
    ).toBe(saved.memoryId);
  });
  test('consolidates compatible records atomically without suppressing their sources until the merged fact is forgotten', async ({ kit, make }) => {
    const org = await make.organization();
    const common = { organizationId: org.id, actorId: 'author', origin: 'manual' as const, scope: { scope: 'room' as const, ownerId: 'room' }, subject: { kind: 'room' as const, id: 'room' } };

    const first = await kit.memory.actions.save({
      ...common,
      operationId: 'one',
      text: 'Green background.',
      sources: [{ roomId: 'room', messageId: 'one', seq: 1, authorId: 'author' }],
    });

    const second = await kit.memory.actions.save({
      ...common,
      operationId: 'two',
      text: 'Rounded buttons.',
      sources: [{ roomId: 'room', messageId: 'two', seq: 2, authorId: 'author' }],
    });

    const input = { ...common, id: first.memoryId, operationId: 'merge', expectedRevision: 1, text: 'Green background and rounded buttons.', sources: [], merge: [{ id: second.memoryId, expectedRevision: 1 }] };
    const merged = await kit.memory.actions.update(input);
    expect(await kit.memory.actions.update(input)).toEqual(merged);

    const listed = await kit.memory.queries.list({
      ...common,
      query: '',
      limit: 30,
    });

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.sources.map((source) => source.messageId)).toEqual(['one', 'two']);
    expect(await kit.memory.queries.suppressed({ organizationId: org.id, sourceIds: ['one', 'two'] })).toEqual([]);
    const exported = await kit.memory.queries.export({ organizationId: org.id });
    expect(exported.items.find((item) => item.id === second.memoryId)).toMatchObject({ text: null, mergedInto: first.memoryId });
    await kit.memory.actions.forget({
      ...common,
      id: first.memoryId,
      operationId: 'forget',
      expectedRevision: merged.revision,
    });
    expect((await kit.memory.queries.suppressed({ organizationId: org.id, sourceIds: ['one', 'two'] })).sort()).toEqual(['one', 'two']);
  });

});
