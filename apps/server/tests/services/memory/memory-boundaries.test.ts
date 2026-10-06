import { describe, expect, vi } from 'vitest';
import { createMemoryCaptureKit } from '../../kits/memory-capture.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ capture: (organizationId: string) => createMemoryCaptureKit(testD1, organizationId) }));

describe('memory review regressions', () => {
  test('rejects provenance overflow without pausing the remaining capture candidates', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      await app.configure(user.id);
      const scope = { scope: 'room' as const, ownerId: 'room' };
      const sources = Array.from({ length: 500 }, (_, index) => ({ roomId: 'room', messageId: `old-${index}`, seq: index + 1, authorId: user.id }));

      const saved = await app.services.memory.actions.save({
        scope,
        organizationId: org.id,
        operationId: 'full',
        actorId: user.id,
        origin: 'manual',
        subject: { kind: 'room', id: 'room' },
        text: 'Existing theme',
        sources,
      });

      app.message('fresh', 501, user.id, 'Use green for the theme and keep the logo round.');
      const request = await app.request();
      await app.services.memoryCapture.actions.receive({
        type: 'memory.extracted',
        roomId: 'room',
        requestId: request.requestId,
        generation: request.generation,
        usage: null,
        error: null,
        result: {
          complete: true,
          recap: 'Theme discussion',
          changes: [
            { id: saved.memoryId, expectedRevision: 1, subject: { kind: 'room', id: 'room' }, text: 'Green theme', sourceIds: ['fresh'] },
            { id: null, expectedRevision: null, subject: { kind: 'room', id: 'room' }, text: 'Round logo', sourceIds: ['fresh'] },
          ],
        },
      });
      expect(app.services.memoryCapture.queries.status({ roomId: 'room' })).toMatchObject({
        status: 'pending',
        cursor: 501,
        error: 'rejected_candidates:1',
      });
      const row = await app.services.memory.queries.get({ organizationId: org.id, id: saved.memoryId });
      expect(row).toMatchObject({ revision: 1, text: 'Existing theme' });
      expect(JSON.parse(row?.sources ?? '[]')).toHaveLength(500);

      const list = await app.services.memory.queries.list({
        organizationId: org.id,
        scope,
        query: 'Round logo',
        limit: 30,
      });

      expect(list.items).toHaveLength(1);
    } finally {
      app.close();
    }
  });

  test('batches source reads and keeps excerpts out of tool results', async ({ kit, make }) => {
    const org = await make.organization();
    const app = kit.capture(org.id);

    try {
      app.room();
      const scope = { scope: 'room' as const, ownerId: 'room' };
      const indexes = [1, 2, 3];
      await Promise.all(indexes.map(async (index) => {
        app.message(`source-${index}`, index, 'author', `Source ${index}`);
        await app.services.memory.actions.save({ organizationId: org.id,
          actorId: 'author',
          operationId: `save-${index}`,
          origin: 'manual',
          scope,
          subject: { kind: 'room', id: 'room' },
          text: `Fact ${index}`,
          sources: [{ roomId: 'room', messageId: `source-${index}`, seq: index, authorId: 'author' }] });
      }));
      const reads = vi.spyOn(app.database, 'all');

      const list = await app.services.memoryState.queries.list({
        scope,
        query: '',
        limit: 30,
        includeSourceText: true,
      });

      expect(reads).toHaveBeenCalledTimes(4);
      expect(list.items).toHaveLength(3);
      expect(list.items.every((fact) => fact.subjectName === 'Memory test' && fact.sources[0]?.text?.startsWith('Source '))).toBe(true);
      reads.mockClear();

      const tools = await app.services.memoryState.queries.list({
        scope,
        query: '',
        limit: 30,
      });

      expect(reads).toHaveBeenCalledTimes(3);
      expect(tools.items.every((fact) => fact.sources[0]?.text === null)).toBe(true);
    } finally {
      app.close();
    }
  });

  test('keeps tool operation IDs independent across runs and enforces read-only access', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      app.message('source', 1, user.id, 'I like green and rounded buttons.');

      const bot = await app.services.bots.actions.create({ organizationId: org.id,
        name: 'Memory helper',
        instructions: '',
        harnessId: 'pi',
        modelProvider: 'test',
        modelId: 'test',
        thinkingLevel: 'off',
        permission: 'full',
        inherit: [],
        avatar: null });

      const now = new Date().toISOString();
      app.database.run(app.database.db.insertInto('member').values({
        roomId: 'room',
        botId: bot.id,
        freshFrom: 0,
        createdAt: now,
      }));
      app.database.run(app.database.db.insertInto('run').values(['first', 'second'].map((id) => ({
        id,
        roomId: 'room',
        botId: bot.id,
        botName: bot.name,
        homeDir: bot.homeDir,
        harnessId: 'pi',
        modelProvider: 'test',
        modelId: 'test',
        thinkingLevel: 'off' as const,
        permission: 'full' as const,
        instructions: '',
        roomInstructions: '',
        inherit: '[]',
        hop: 0,
        triggerMessageId: 'source',
        contextThrough: 1,
        acceptedAt: now,
        status: 'running' as const,
        activity: 'thinking' as const,
        activeTools: 0,
        waitedMs: 0,
        seat: 'required' as const,
        createdAt: now,
        updatedAt: now,
      }))));
      const input = { operationId: 'save-1', subject: { kind: 'user' as const, id: user.id }, text: 'Likes green', sourceMessageIds: ['source'] };
      const first = await app.services.mcpInternal.actions.call({ runId: 'first', call: { name: 'memory_save', input } });
      expect(first.isError).toBe(false);
      expect(await app.services.mcpInternal.actions.call({ runId: 'first', call: { name: 'memory_save', input } })).toEqual(first);
      const second = await app.services.mcpInternal.actions.call({ runId: 'second', call: { name: 'memory_save', input: { ...input, text: 'Likes rounded buttons' } } });
      expect(second.isError).toBe(false);
      expect(second.text).not.toBe(first.text);
      app.database.run(app.database.db.updateTable('run').set({ permission: 'read-only' }).where('id', '=', 'second'));
      const denied = await app.services.mcpInternal.actions.call({ runId: 'second', call: { name: 'memory_save', input: { ...input, operationId: 'denied', text: 'Unauthorized' } } });
      expect(denied).toMatchObject({ isError: true, text: 'FORBIDDEN' });
      expect((await app.services.memory.queries.list({
        organizationId: org.id,
        scope: { scope: 'room', ownerId: 'room' },
        query: '',
        limit: 30,
      })).items).toHaveLength(2);
    } finally {
      app.close();
    }
  });

  test('backs off malformed persisted extraction instead of rearming an expired alarm', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      await app.configure(user.id);
      app.message('source', 1, user.id, 'Use green.');
      await app.request();
      app.database.run(app.database.db.updateTable('memoryRoom').set({
        status: 'applying',
        result: '{}',
        dueAt: 0,
      }).where('roomId', '=', 'room'));
      await app.services.memoryCapture.actions.tick();
      const status = app.services.memoryCapture.queries.status({ roomId: 'room' });
      expect(status).toMatchObject({
        status: 'pending',
        error: 'apply_failed',
        cursor: 0,
      });
      expect(status?.dueAt).toBeGreaterThan(Date.now());
    } finally {
      app.close();
    }
  });

});
