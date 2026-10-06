import { describe, expect, vi } from 'vitest';
import { createMemoryCaptureKit } from '../../kits/memory-capture.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ capture: (organizationId: string) => createMemoryCaptureKit(testD1, organizationId) }));

describe('durable memory capture', () => {
  test('freezes sources, rejects invalid candidates and does not process new arrivals early', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const { services, database, messages, close } = kit.capture(org.id);

    try {
      database.run(
        database.db.insertInto('room').values({
          id: 'room',
          kind: 'group',
          name: 'Memory test',
          memberKey: '',
          leaderBotId: null,
          description: '',
          stoppedThrough: null,
          createdAt: new Date().toISOString(),
          pinned: 0,
          position: null,
          driver: null,
          rotation: 0,
          sendMode: 'queue',
        }),
      );
      await services.organization.actions.configure({
        organizationId: org.id,
        userId: user.id,
        settings: { memory: { model: { harnessId: 'pi', modelProvider: 'test', modelId: 'test', thinkingLevel: 'off' } } },
      });
      services.memoryCapture.actions.control({ roomId: 'room', action: 'enable' });
      database.run(
        database.db.insertInto('message').values({
          id: 'first',
          roomId: 'room',
          seq: 1,
          role: 'user',
          authorId: user.id,
          authorName: 'Ada',
          parts: JSON.stringify([{ type: 'text', text: 'I prefer green.' }]),
          runId: null,
          route: null,
          usage: null,
          replyTo: null,
          rerunOf: null,
          triggerId: null,
          reactionId: null,
          createdAt: new Date().toISOString(),
        }),
      );
      database.run(database.db.updateTable('memoryRoom').set({ dueAt: 0 }).where('roomId', '=', 'room'));
      const prepared = await services.memoryCapture.actions.tick();

      if (prepared) {
        services.memoryCapture.actions.dispatch({ request: prepared, useful: true });
      }

      const request = messages.find((message) => message.type === 'memory.extract');
      expect(request?.type).toBe('memory.extract');
      if (request?.type !== 'memory.extract') {
        throw new TypeError('Expected memory extraction');
      }
      database.run(
        database.db.insertInto('message').values({
          id: 'second',
          roomId: 'room',
          seq: 2,
          role: 'user',
          authorId: user.id,
          authorName: 'Ada',
          parts: JSON.stringify([{ type: 'text', text: 'Actually blue.' }]),
          runId: null,
          route: null,
          usage: null,
          replyTo: null,
          rerunOf: null,
          triggerId: null,
          reactionId: null,
          createdAt: new Date().toISOString(),
        }),
      );

      const result = {
        type: 'memory.extracted' as const,
        requestId: request.requestId,
        generation: request.generation,
        roomId: 'room',
        error: null,
        usage: null,
        result: {
          changes: [
            {
              id: null,
              expectedRevision: null,
              subject: { kind: 'user' as const, id: 'forged' },
              text: 'Forged preference',
              sourceIds: ['first'],
            },
            {
              id: null,
              expectedRevision: null,
              subject: { kind: 'user' as const, id: user.id },
              text: 'Ada prefers green.',
              sourceIds: ['first'],
            },
          ],
          complete: true,
          recap: 'Ada prefers green.',
        },
      };

      await services.memoryCapture.actions.receive(result);
      await services.memoryCapture.actions.receive(result);

      const facts = await services.memoryState.queries.list({
        scope: { scope: 'room', ownerId: 'room' },
        query: '',
        limit: 30,
      });

      expect(facts.items.map((fact) => fact.text)).toEqual(['Ada prefers green.']);
      expect(services.memoryCapture.queries.status({ roomId: 'room' })?.cursor).toBe(1);
    } finally {
      close();
    }
  });

  test('postpones pending rooms while one extraction holds capacity and never reverses the cursor on skip', async ({ kit, make }) => {
    const org = await make.organization();
    const { services, database, close } = kit.capture(org.id);

    try {
      for (const id of ['one', 'two']) {
        database.run(
          database.db.insertInto('room').values({
            id,
            kind: 'group',
            name: id,
            memberKey: id,
            leaderBotId: null,
            description: '',
            stoppedThrough: null,
            createdAt: new Date().toISOString(),
            pinned: 0,
            position: null,
            driver: null,
            rotation: 0,
            sendMode: 'queue',
          }),
        );
        services.memoryCapture.actions.control({ roomId: id, action: 'enable' });
      }
      database.run(
        database.db
          .updateTable('memoryRoom')
          .set({
            status: 'running',
            requestId: 'inflight',
            dueAt: Date.now() + 60000,
          })
          .where('roomId', '=', 'one'),
      );
      database.run(database.db.updateTable('memoryRoom').set({ status: 'pending', dueAt: 0 }).where('roomId', '=', 'two'));
      await services.memoryCapture.actions.tick();
      expect(services.memoryCapture.queries.status({ roomId: 'two' })?.dueAt).toBeGreaterThan(Date.now() + 1000);
      database.run(
        database.db
          .updateTable('memoryRoom')
          .set({
            status: 'paused',
            cursor: 20,
            throughSeq: 3,
            source: '[]',
          })
          .where('roomId', '=', 'two'),
      );
      services.memoryCapture.actions.control({ roomId: 'two', action: 'skip' });
      expect(services.memoryCapture.queries.status({ roomId: 'two' })?.cursor).toBe(20);
    } finally {
      close();
    }
  });
  test('enforces a negative Jev verdict and drops a verdict after capture is disabled', async ({ kit, make }) => {
    const org = await make.organization();
    const user = await make.user();
    await make.member({ organizationId: org.id, userId: user.id });
    const app = kit.capture(org.id);

    try {
      app.room();
      await app.configure(user.id);
      app.message('greeting', 1, user.id, 'Hello there.');
      app.database.run(app.database.db.updateTable('memoryRoom').set({ dueAt: 0 }).where('roomId', '=', 'room'));
      const request = await app.services.memoryCapture.actions.tick();

      if (!request) {
        throw new TypeError('Expected prepared capture');
      }
      app.services.memoryCapture.actions.dispatch({ request, useful: false });
      await app.services.memoryCapture.actions.receive({
        ...request,
        type: 'memory.extracted',
        error: null,
        usage: null,
        result: {
          complete: false,
          changes: [{ id: null, expectedRevision: null, subject: { kind: 'user', id: user.id }, text: 'Invented preference', sourceIds: ['greeting'] }],
          recap: 'The user greeted the room.',
        },
      });
      expect((await app.services.memory.queries.export({ organizationId: org.id })).items).toHaveLength(0);
      const state = app.database.all(app.database.db.selectFrom('memoryRoom').selectAll().where('roomId', '=', 'room'))[0];
      expect(state.cursor).toBe(1);
      expect(state.recap).toBe('The user greeted the room.');
      app.message('new', 2, user.id, 'I prefer green.');
      app.database.run(app.database.db.updateTable('memoryRoom').set({ dueAt: 0 }).where('roomId', '=', 'room'));
      const stale = await app.services.memoryCapture.actions.tick();

      if (!stale) {
        throw new TypeError('Expected prepared capture');
      }

      const sent = app.messages.length;
      app.services.memoryCapture.actions.control({ roomId: 'room', action: 'disable' });
      app.services.memoryCapture.actions.dispatch({ request: stale, useful: true });
      expect(app.messages).toHaveLength(sent);
    } finally {
      app.close();
    }
  });

  test('runs Jev after a long bot reply while preserving the new human evidence', async ({ kit, make }) => {
    const org = await make.organization();
    const app = kit.capture(org.id);

    try {
      const judge = vi.spyOn(app.services.jev, 'systemOne').mockRejectedValueOnce(new TypeError('Simulated provider outage'));
      const text = 'I prefer green for my dashboard.';
      expect(await app.services.route.queries.memory({ prompt: JSON.stringify({
        sources: [{ id: 'new', seq: 1, role: 'user', authorId: 'ada', authorName: 'Ada', text }],
        context: [{ role: 'assistant', authorId: 'bot', text: 'A long previous answer. '.repeat(400) }],
      }) })).toBe(true);
      expect(judge).toHaveBeenCalledOnce();
      const state = judge.mock.calls[0]?.[0].state;
      expect(JSON.stringify(state).length).toBeLessThanOrEqual(2000);
      expect(JSON.stringify(state)).toContain(text);
      judge.mockRestore();
    } finally {
      app.close();
    }
  });

});
