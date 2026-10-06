import { Errors } from '@orbs/errors/universal';
import { log } from '@orbs/logger/server';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATABASE } from '#services/database/database.constants';
import { makeDatabaseService } from '#services/database/database.service';
import { TENANT } from '#services/tenant/tenant.constants';
import { makeTenantServices } from './core.services';
import type { DatabaseTenantSchema } from '#/types/database-tenant.types';
import type { TenantCallsOperation } from '#/types/tenant-calls.types';
import type * as TenantRuntimeTypes from '#/types/tenant-runtime.types';
import type { TenantEvent, TenantSockets } from '#/types/tenant.types';

function makeTenantRuntime(deps: TenantRuntimeTypes.TenantRuntimeDeps): TenantRuntimeTypes.TenantRuntime {
  const tenantDatabase = makeDatabaseService<DatabaseTenantSchema>({
    path: deps.path,
    migrations: DATABASE.tenantMigrations,
    env: deps.env,
  });

  const entries: TenantRuntimeTypes.TenantRuntimeSocketEntry[] = [];
  const work = new Set<Promise<void>>();
  const queue: TenantRuntimeTypes.TenantRuntimeQueue = { items: [], scheduled: false, holding: false, disposed: false };
  const alarm: TenantRuntimeTypes.TenantRuntimeAlarm = { at: null, version: 0, notBefore: 0, timer: null, running: false, failures: 0 };
  let disposing: Promise<void> | null = null;

  function track(promise: Promise<void>): void {
    const settled = promise.catch(() => undefined);

    work.add(settled);
    void settled.then(() => work.delete(settled));
  }

  async function drain(): Promise<void> {
    if (work.size === 0) {
      return;
    }

    await Promise.all(work);
    await drain();
  }

  function queueNext(): void {
    if (queue.scheduled || queue.holding || queue.items.length === 0) {
      return;
    }

    queue.scheduled = true;
    setImmediate(() => {
      queue.scheduled = false;

      if (!queue.holding) {
        queue.items.shift()?.run();
      }

      queueNext();
    });
  }

  function enqueue<T>(operation: TenantCallsOperation<T>, exclusive: boolean): Promise<T> {
    if (queue.disposed) {
      return Promise.reject(new Errors.CONFLICT());
    }

    return new Promise<T>((resolve, reject) => {
      queue.items.push({
        run: () => {
          queue.holding = exclusive;

          const completed = Promise.resolve().then(operation).then(resolve, reject);
          track(completed);

          if (exclusive) {
            void completed.then(() => {
              queue.holding = false;
              queueNext();
            });
          }
        },
        cancel: () => reject(new Errors.CONFLICT()),
      });
      queueNext();
    });
  }

  function alarmSchedule(): void {
    if (alarm.timer) {
      clearTimeout(alarm.timer);
      alarm.timer = null;
    }

    if (alarm.at === null || alarm.running || queue.disposed) {
      return;
    }

    const delay = Math.min(Math.max(Math.max(alarm.at, alarm.notBefore) - Date.now(), 0), TENANT.alarmMaxDelayMs);

    alarm.timer = setTimeout(async () => {
      alarm.timer = null;

      if (alarm.at === null || Math.max(alarm.at, alarm.notBefore) > Date.now()) {
        alarmSchedule();

        return;
      }

      const firedVersion = alarm.version;
      alarm.running = true;

      try {
        await enqueue(() => services.calls.alarm(), false);
        alarm.failures = 0;
        alarm.notBefore = Date.now() + TENANT.alarmRepassMs;

        if (alarm.version === firedVersion) {
          alarm.at = null;
        }
      } catch (error) {
        alarm.failures += 1;
        alarm.notBefore = Date.now() + Math.min(TENANT.alarmBackoffMs * 2 ** (alarm.failures - 1), TENANT.alarmBackoffMaxMs);
        log.warn({
          tag: 'tenant',
          message: 'Tenant alarm pass failed; retrying with backoff',
          failures: alarm.failures,
          error,
        });
      } finally {
        alarm.running = false;
        alarmSchedule();
      }
    }, delay);
  }

  function openEntries(tag: string): TenantRuntimeTypes.TenantRuntimeSocketEntry[] {
    return entries.filter((entry) => entry.open && entry.tags.includes(tag));
  }

  function closeEntry(entry: TenantRuntimeTypes.TenantRuntimeSocketEntry, code: number, reason: string): void {
    entry.open = false;
    entry.socket.close(code, reason);
  }

  const sockets: TenantSockets = {
    broadcast: (event) => {
      const message = JSON.stringify(event);

      for (const entry of openEntries(TENANT.browserTag)) {
        entry.socket.send(message);
      }
    },
    daemon: () => {
      const entry = openEntries(TENANT.daemonTag).at(-1);

      if (!entry?.attachment) {
        return undefined;
      }

      return {
        harnessIds: entry.attachment.harnessIds,
        maxTurns: entry.attachment.maxTurns,
        send: (message) => entry.socket.send(JSON.stringify(message)),
        close: () => closeEntry(entry, TENANT.unresponsiveCloseCode, 'unresponsive'),
      };
    },
    closeDaemons: () => {
      for (const entry of entries.filter((item) => item.tags.includes(TENANT.daemonTag))) {
        closeEntry(entry, TENANT.daemonReplacedCloseCode, 'replaced');
      }
    },
    revoke: (tag) => {
      const closing = openEntries(tag);

      for (const entry of closing) {
        closeEntry(entry, TENANT.revokedCloseCode, 'revoked');
      }

      return closing.some((entry) => entry.tags.includes(TENANT.daemonTag));
    },
  };

  const services = makeTenantServices({
    database: { main: deps.database.main, tenant: tenantDatabase },
    storage: deps.storage,
    env: deps.env,
    organizationId: deps.organizationId,
    sockets,
    alarm: {
      set: (at) => {
        alarm.at = at;
        alarm.version += 1;
        alarmSchedule();
      },
    },
    enter: (operation) => enqueue(operation, false),
    exclusive: (operation) => enqueue(operation, true),
    waitUntil: track,
  });

  function connect(params: TenantRuntimeTypes.TenantRuntimeConnectParams): TenantRuntimeTypes.TenantRuntimeConnection {
    const entry: TenantRuntimeTypes.TenantRuntimeSocketEntry = {
      socket: params.socket,
      tags: [params.daemon ? TENANT.daemonTag : TENANT.browserTag, params.ownerTag],
      open: true,
      attachment: null,
    };

    void enqueue(() => {
      if (params.daemon) {
        services.harness.actions.connect();
      }

      entries.push(entry);

      if (!params.daemon) {
        entry.socket.send(JSON.stringify({ type: 'tenant.connected' } satisfies TenantEvent));
      }
    }, false).catch(() => closeEntry(entry, TENANT.shutdownCloseCode, 'shutdown'));

    return {
      message: (data) => {
        void enqueue(async () => {
          if (!params.daemon || !entry.open) {
            return;
          }

          try {
            await services.calls.daemonMessage({
              data,
              socket: {
                current: () => entry === openEntries(TENANT.daemonTag).at(-1),
                send: (message) => {
                  if (entry.open) {
                    entry.socket.send(JSON.stringify(message));
                  }
                },
                attach: (attachment) => {
                  entry.attachment = attachment;
                },
                close: (code, reason) => closeEntry(entry, code, reason),
              },
            });
          } catch (error) {
            log.error({
              tag: 'tenant',
              message: 'Daemon message failed',
              error,
            });
          }
        }, false).catch(() => undefined);
      },
      closed: () => {
        void enqueue(() => {
          const index = entries.indexOf(entry);

          if (index === -1) {
            return;
          }

          entry.open = false;
          entries.splice(index, 1);

          if (params.daemon) {
            services.harness.actions.closed({ othersOpen: openEntries(TENANT.daemonTag).length > 0 });
          }
        }, false).catch(() => undefined);
      },
    };
  }

  async function close(): Promise<void> {
    queue.disposed = true;

    for (const item of queue.items.splice(0)) {
      item.cancel();
    }

    alarmSchedule();

    for (const entry of entries.filter((item) => item.open)) {
      closeEntry(entry, TENANT.shutdownCloseCode, 'shutdown');
    }

    await drain();
    tenantDatabase.close();
  }

  function dispose(): Promise<void> {
    disposing ??= close();

    return disposing;
  }

  const ready = enqueue(async () => {
    await tenantDatabase.migrate();
    services.run.actions.arm();
  }, true);

  void ready.catch(dispose);

  return { ready, calls: services.calls, connect, dispose };
}

export function makeTenantRuntimeDirectory(deps: TenantRuntimeTypes.TenantRuntimeDirectoryDeps): TenantRuntimeTypes.TenantRuntimeDirectory {
  const runtimes = new Map<string, TenantRuntimeTypes.TenantRuntime>();

  function runtimePath(organizationId: string): string {
    return join(deps.path, `${organizationId}.sqlite`);
  }

  function runtime(organizationId: string): TenantRuntimeTypes.TenantRuntime {
    const existing = runtimes.get(organizationId);

    if (existing) {
      return existing;
    }

    if (!TENANT.organizationIdPattern.test(organizationId)) {
      throw new Errors.INTERNAL_ERROR({ internal: 'Organization id is not a safe tenant file name' });
    }

    mkdirSync(deps.path, { recursive: true });

    const created = makeTenantRuntime({
      ...deps,
      organizationId,
      path: runtimePath(organizationId),
    });

    runtimes.set(organizationId, created);
    void created.ready.catch(() => {
      if (runtimes.get(organizationId) === created) {
        runtimes.delete(organizationId);
      }
    });

    return created;
  }

  return {
    start: async () => {
      const organizations = await deps.database.main.db.selectFrom('organization').select('id').execute();
      const existing = organizations.filter((organization) => existsSync(runtimePath(organization.id)));

      await Promise.all(existing.map((organization) => runtime(organization.id).ready));
    },
    getByName: (organizationId) => runtime(organizationId).calls,
    connect: (organizationId, params) => runtime(organizationId).connect(params),
    dispose: async () => {
      const disposing = [...runtimes.values()];

      runtimes.clear();
      await Promise.all(disposing.map((item) => item.dispose()));
    },
  };
}
