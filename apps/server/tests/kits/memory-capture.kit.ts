import { vi } from 'vitest';
import { makeTenantServices } from '#/core/core.services';
import { makeStorageService } from '#services/storage/storage.service';
import { createBoundaryMocks } from '../mocks';
import { createTestTenant } from '../support/database';
import { TEST_ENV } from '../support/env';
import type { DaemonServerMessage } from '#/types/daemon.types';
import type { TestD1 } from '../support/database';

export function createMemoryCaptureKit(testD1: TestD1, organizationId: string) {
  const tenant = createTestTenant();
  const messages: DaemonServerMessage[] = [];
  const alarm = vi.fn<() => void>();

  const services = makeTenantServices({
    database: { main: testD1.database, tenant: tenant.database },
    organizationId,
    storage: makeStorageService({ driver: 'cloudflare', bucket: createBoundaryMocks().bucket() }),
    env: TEST_ENV,
    alarm: { set: alarm },
    enter: (operation) => Promise.resolve().then(operation),
    exclusive: (operation) => Promise.resolve().then(operation),
    waitUntil: vi.fn<(promise: Promise<void>) => void>(),
    sockets: {
      broadcast: vi.fn<() => void>(),
      closeDaemons: vi.fn<() => void>(),
      revoke: vi.fn<() => boolean>(() => false),
      daemon: () => ({ harnessIds: ['pi'], maxTurns: 3, close: vi.fn<() => void>(), send: (outgoing) => messages.push(outgoing) }),
    },
  });

  function room(id = 'room') {
    tenant.database.run(
      tenant.database.db.insertInto('room').values({
        id,
        kind: 'group',
        name: 'Memory test',
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

  function message(id: string, seq: number, authorId: string, text: string) {
    tenant.database.run(
      tenant.database.db.insertInto('message').values({
        id,
        seq,
        authorId,
        roomId: 'room',
        role: 'user',
        authorName: 'Ada',
        parts: JSON.stringify([{ type: 'text', text }]),
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
  }

  async function request() {
    tenant.database.run(tenant.database.db.updateTable('memoryRoom').set({ dueAt: 0 }).where('roomId', '=', 'room'));
    const prepared = await services.memoryCapture.actions.tick();

    if (prepared) {
      services.memoryCapture.actions.dispatch({ request: prepared, useful: true });
    }

    const result = messages.filter((item) => item.type === 'memory.extract').at(-1);

    if (result?.type !== 'memory.extract') {
      throw new TypeError('Expected extraction request');
    }

    return result;
  }

  async function configure(userId: string) {
    await services.organization.actions.configure({
      organizationId,
      userId,
      settings: {
        memory: {
          model: {
            harnessId: 'pi',
            modelProvider: 'test',
            modelId: 'test',
            thinkingLevel: 'off',
          },
        },
      },
    });
  }

  return { ...tenant, services, messages, alarm, room, message, request, configure };
}
