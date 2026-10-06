import { describe, expect, vi } from 'vitest';
import { createMemoryCaptureKit } from '../../kits/memory-capture.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ capture: (organizationId: string) => createMemoryCaptureKit(testD1, organizationId) }));

describe('memory recovery boundaries', () => {
  test('recovers a committed D1 save when rendering its tenant snapshot fails', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();

      const input = {
        operationId: 'durable-save',
        scope: { scope: 'room' as const, ownerId: 'room' },
        subject: { kind: 'user' as const, id: user.id },
        text: 'Ada prefers green.',
        sourceMessageIds: [],
      };

      const fail = vi.spyOn(app.services.memory.queries, 'snapshot').mockRejectedValueOnce(new TypeError('D1 unavailable'));
      await expect(app.services.memoryState.actions.mutate({ actorId: user.id, mutation: { action: 'save', input } })).rejects.toThrow(
        'D1 unavailable',
      );
      expect((await app.services.memory.queries.export({ organizationId: org.id })).items).toHaveLength(1);
      expect((await app.services.memoryState.queries.list({
        scope: input.scope,
        query: '',
        limit: 30,
      })).pending).toBe(true);
      fail.mockRestore();
      await app.services.memoryState.actions.recover();
      const receipt = await app.services.memoryState.actions.mutate({ actorId: user.id, mutation: { action: 'save', input } });
      expect(receipt.revision).toBe(1);
      expect((await app.services.memoryState.queries.list({
        scope: input.scope,
        query: '',
        limit: 30,
      })).pending).toBe(false);
      expect((await app.services.memory.queries.export({ organizationId: org.id })).items).toHaveLength(1);
    } finally {
      app.close();
    }
  });

  test('forget blocks tool resurrection and an in-flight recap while leaving another room recap intact', async ({ kit, make }) => {
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
        operationId: 'save',
        scope: { scope: 'room' as const, ownerId: 'room' },
        subject: { kind: 'user' as const, id: user.id },
        text: 'Ada prefers green.',
        sourceMessageIds: ['source'],
      };

      const saved = await app.services.memoryState.actions.mutate({ actorId: user.id, mutation: { action: 'save', input } });
      const request = await app.request();
      app.database.run(app.database.db.updateTable('memoryRoom').set({ recap: 'Unrelated decision' }).where('roomId', '=', 'other'));
      await app.services.memoryState.actions.mutate({
        actorId: user.id,
        mutation: { action: 'forget', input: { ...input, operationId: 'forget', id: saved.memoryId, expectedRevision: 1 } },
      });
      await expect(
        app.services.memoryState.actions.mutate({
          actorId: 'bot',
          roomId: 'room',
          mutation: { action: 'save', input: { ...input, operationId: 'resurrect' } },
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await app.services.memoryCapture.actions.receive({
        ...request,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: {
          complete: true,
          changes: [{ id: null, expectedRevision: null, subject: input.subject, text: input.text, sourceIds: ['source'] }],
          recap: 'Ada prefers green.',
        },
      });
      expect((await app.services.memoryState.queries.list({
        scope: input.scope,
        query: '',
        limit: 30,
      })).items).toHaveLength(0);
      expect(app.database.all(app.database.db.selectFrom('memoryRoom').select('recap').where('roomId', '=', 'room'))[0]?.recap).toBe('');
      expect(app.database.all(app.database.db.selectFrom('memoryRoom').select('recap').where('roomId', '=', 'other'))[0]?.recap).toBe(
        'Unrelated decision',
      );
    } finally {
      app.close();
    }
  });

  test('applies overflow candidates and resumes the frozen range before advancing', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      await app.configure(user.id);
      app.message('source', 1, user.id, 'I like green and blue.');
      const first = await app.request();

      const candidate = {
        id: null,
        expectedRevision: null,
        subject: { kind: 'user' as const, id: user.id },
        text: 'Ada likes green.',
        sourceIds: ['source'],
      };

      await app.services.memoryCapture.actions.receive({
        ...first,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: { changes: [candidate], complete: false, recap: '' },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor).toBe(0);
      const second = await app.request();
      expect(second.requestId).not.toBe(first.requestId);
      expect(JSON.parse(second.prompt).existing).toHaveLength(1);
      await app.services.memoryCapture.actions.receive({
        ...second,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: { changes: [{ ...candidate, text: 'Ada likes blue.' }], complete: true, recap: 'Ada likes green and blue.' },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor).toBe(1);
      expect((await app.services.memory.queries.export({ organizationId: org.id })).items).toHaveLength(2);
    } finally {
      app.close();
    }
  });

  test('continues oversized sources without losing their tail and rejects disabled generations', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      await app.configure(user.id);
      const text = `${'hello '.repeat(550)}Tail matters.`;
      app.message('long', 1, user.id, text);
      const first = await app.request();
      expect(JSON.parse(first.prompt).sources[0].text).toBe(text.slice(0, 3000));
      await app.services.memoryCapture.actions.receive({
        ...first,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: { changes: [], complete: true, recap: '' },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor).toBe(0);
      const second = await app.request();
      expect(JSON.parse(second.prompt).sources[0].text).toBe(text.slice(3000));
      await app.services.memoryCapture.actions.receive({
        ...second,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: { changes: [], complete: true, recap: '' },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })?.cursor).toBe(1);
      app.message('second', 2, user.id, 'I prefer green.');
      const third = await app.request();
      app.services.memoryCapture.actions.control({ roomId: 'room', action: 'disable' });
      await app.services.memoryCapture.actions.receive({
        ...third,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: { changes: [], complete: true, recap: 'Stale recap' },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })).toMatchObject({
        cursor: 1,
        enabled: 0,
        status: 'idle',
      });
    } finally {
      app.close();
    }
  });
  test('keeps people distinct, isolates bot memory and preserves promoted facts after source-room deletion', async ({ kit, make }) => {
    const org = await make.organization();
    const ada = await make.user();
    const bob = await make.user();
    await make.member({ organizationId: org.id, userId: ada.id });
    await make.member({ organizationId: org.id, userId: bob.id });
    const app = kit.capture(org.id);

    try {
      app.room();

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

      const scope = { scope: 'room' as const, ownerId: 'room' };
      const input = { scope, operationId: 'ada', subject: { kind: 'user' as const, id: ada.id }, text: 'Prefers green.', sourceMessageIds: [] };
      const first = await app.services.memoryState.actions.mutate({ actorId: ada.id, mutation: { action: 'save', input } });
      await app.services.memoryState.actions.mutate({ actorId: bob.id, mutation: { action: 'save', input: { ...input, operationId: 'bob', subject: { kind: 'user', id: bob.id } } } });
      expect((await app.services.memoryState.queries.list({
        scope,
        query: '',
        limit: 30,
      })).items).toHaveLength(2);
      await app.services.memoryState.actions.mutate({ actorId: ada.id, mutation: { action: 'share', input: { scope, operationId: 'promote', id: first.memoryId, expectedRevision: first.revision, destination: { scope: 'global', ownerId: '' } } } });
      await app.services.memoryState.actions.mutate({ actorId: ada.id, mutation: { action: 'save', input: { ...input, operationId: 'bot', scope: { scope: 'bot', ownerId: bot.id }, text: 'Only this bot uses a violet badge.' } } });
      expect((await app.services.memoryState.queries.list({
        scope: { scope: 'global', ownerId: '' },
        query: 'violet',
        limit: 30,
      })).items).toHaveLength(0);
      expect(app.services.room.actions.delete({ roomId: 'room', kind: 'group' })).toBe('deleted');
      await expect(app.services.memoryState.queries.list({
        scope,
        query: '',
        limit: 30,
      })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await app.services.memoryState.actions.recover();
      await app.services.bots.actions.delete({ organizationId: org.id, botId: bot.id });
      const exported = await app.services.memory.queries.export({ organizationId: org.id });
      expect(exported.items).toHaveLength(1);
      expect(exported.items[0]).toMatchObject({ id: first.memoryId, scope: 'global' });
    } finally {
      app.close();
    }
  });
});
