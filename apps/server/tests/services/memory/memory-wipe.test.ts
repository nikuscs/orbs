import { describe, expect, vi } from 'vitest';
import { createMemoryCaptureKit } from '../../kits/memory-capture.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({
  capture: (organizationId: string) =>
    createMemoryCaptureKit(testD1, organizationId),
}));

describe('scope memory wipe', () => {
  test('clears every page, cancels old capture and replays without losing new facts', async ({
    kit,
    make,
  }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      app.room('other');
      await app.configure(user.id);
      app.message('source', 1, user.id, 'I prefer green.');

      const input = {
        organizationId: org.id,
        actorId: user.id,
        scope: { scope: 'room' as const, ownerId: 'room' },
        subject: { kind: 'user' as const, id: user.id },
        origin: 'manual' as const,
        sources: [
          { roomId: 'room', messageId: 'source', seq: 1, authorId: user.id },
        ],
      };

      await Promise.all(
        Array.from({ length: 65 }, (_, index) =>
          app.services.memory.actions.save({
            ...input,
            operationId: `save-${index}`,
            text: `Preference ${index}`,
          }),
        ),
      );
      await app.services.memory.actions.save({
        ...input,
        operationId: 'global',
        scope: { scope: 'global', ownerId: '' },
        text: 'Global stays.',
      });
      await app.services.memory.actions.save({
        ...input,
        operationId: 'other',
        scope: { scope: 'room', ownerId: 'other' },
        text: 'Other room stays.',
      });

      const page = await app.services.memoryState.queries.list({
        scope: input.scope,
        query: '',
        limit: 30,
      });

      expect(page.items).toHaveLength(30);
      expect(
        (
          await app.services.memoryState.queries.list({
            scope: input.scope,
            query: '',
            limit: 30,
            before: page.next,
          })
        ).items,
      ).toHaveLength(30);
      const request = await app.request();
      app.database.run(
        app.database.db
          .updateTable('memoryRoom')
          .set({
            status: 'applying',
            result: JSON.stringify({
              changes: [],
              complete: true,
              recap: 'Old recap',
            }),
          })
          .where('roomId', '=', 'room'),
      );
      const wipe = { scope: input.scope, operationId: 'wipe' };
      expect(await app.services.memoryState.actions.wipe(wipe)).toEqual({
        count: 65,
      });

      const state = app.database.all(
        app.database.db
          .selectFrom('memoryRoom')
          .selectAll()
          .where('roomId', '=', 'room'),
      )[0];

      expect(state).toMatchObject({
        enabled: 1,
        status: 'idle',
        cursor: 1,
        source: null,
        result: null,
        requestId: null,
        offset: 0,
        recapFrom: 2,
        recap: '',
      });
      expect(state.generation).not.toBe(request.generation);
      expect(
        (
          await app.services.memoryState.queries.list({
            scope: input.scope,
            query: '',
            limit: 30,
          })
        ).items,
      ).toHaveLength(0);
      expect(
        await app.services.memory.queries.suppressed({
          organizationId: org.id,
          sourceIds: ['source'],
        }),
      ).toEqual(['source']);
      await app.services.memoryCapture.actions.receive({
        ...request,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: {
          changes: [
            {
              id: null,
              expectedRevision: null,
              subject: input.subject,
              text: 'Revived',
              sourceIds: ['source'],
            },
          ],
          complete: true,
          recap: 'Old recap',
        },
      });
      app.message('new', 2, user.id, 'I prefer blue now.');
      await app.services.memoryState.actions.mutate({
        actorId: user.id,
        roomId: 'room',
        mutation: {
          action: 'save',
          input: {
            scope: input.scope,
            operationId: 'new',
            text: 'Blue is new.',
            subject: input.subject,
            sourceMessageIds: ['new'],
          },
        },
      });
      expect(await app.services.memoryState.actions.wipe(wipe)).toEqual({
        count: 65,
      });
      expect(
        app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor,
      ).toBe(1);
      expect(
        (
          await app.services.memory.queries.export({ organizationId: org.id })
        ).items
          .filter((item) => item.text !== null)
          .map((item) => item.text)
          .sort((first, second) => String(first).localeCompare(String(second))),
      ).toEqual(['Blue is new.', 'Global stays.', 'Other room stays.']);
      await expect(
        app.services.memoryState.actions.wipe({
          ...wipe,
          scope: { scope: 'room', ownerId: 'other' },
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(
        app.services.memoryState.actions.wipe({
          ...wipe,
          scope: { scope: 'room', ownerId: 'missing' },
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    } finally {
      app.close();
    }
  });

  test('bot wipe clears only source recaps, leaves room capture and recovers a failed snapshot refresh', async ({
    kit,
    make,
  }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      app.room('other');
      app.message('source', 1, user.id, 'I prefer green.');

      const bot = await app.services.bots.actions.create({
        organizationId: org.id,
        name: 'Helper',
        avatar: null,
        instructions: '',
        harnessId: 'pi',
        modelProvider: 'test',
        modelId: 'test',
        thinkingLevel: 'off',
        permission: 'read-only',
        inherit: [],
      });

      const scope = { scope: 'bot' as const, ownerId: bot.id };
      await app.services.memory.actions.save({
        organizationId: org.id,
        actorId: user.id,
        scope,
        operationId: 'save',
        subject: { kind: 'user', id: user.id },
        text: 'Green',
        origin: 'manual',
        sources: [
          { roomId: 'room', messageId: 'source', seq: 1, authorId: user.id },
        ],
      });
      app.database.run(
        app.database.db
          .updateTable('memoryRoom')
          .set({ recap: 'Existing recap' }),
      );

      const before = app.services.memoryCapture.queries.status({
        roomId: 'room',
      });

      const fail = vi
        .spyOn(app.services.memory.queries, 'snapshot')
        .mockRejectedValueOnce(new TypeError('Offline'));

      const wipe = { scope, operationId: 'wipe' };
      await expect(app.services.memoryState.actions.wipe(wipe)).rejects.toThrow(
        'Offline',
      );
      fail.mockRestore();
      expect(
        app.database.all(
          app.database.db
            .selectFrom('memoryRoom')
            .select(['roomId', 'recap'])
            .orderBy('roomId'),
        ),
      ).toEqual([
        { roomId: 'other', recap: 'Existing recap' },
        { roomId: 'room', recap: '' },
      ]);
      expect(
        app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor,
      ).toBe(before?.cursor);
      expect(await app.services.memoryState.actions.wipe(wipe)).toEqual({
        count: 1,
      });
      expect(
        (
          await app.services.memoryState.queries.list({
            scope,
            query: '',
            limit: 30,
          })
        ).items,
      ).toHaveLength(0);
      expect(
        await app.services.memory.queries.suppressed({
          organizationId: org.id,
          sourceIds: ['source'],
        }),
      ).toEqual(['source']);
    } finally {
      app.close();
    }
  });
});
