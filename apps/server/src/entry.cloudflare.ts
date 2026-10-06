import { envServer } from '@orbs/env/server';
import { DurableObject } from 'cloudflare:workers';
import { makeServices, makeTenantServices } from '#/core/core.services';
import { daemonAttachment } from '#/types/daemon.types';
import { makeDatabaseD1Service } from '#services/database/database-d1.service';
import { makeDatabaseDurableService } from '#services/database/database-durable.service';
import { makeRateLimiterService } from '#services/rate-limiter/rate-limiter.service';
import { makeStorageService } from '#services/storage/storage.service';
import { TENANT } from '#services/tenant/tenant.constants';
import type { HarnessActionListModelsParams, HarnessActionListSkillsParams } from '#/types/harness.types';
import type * as RoomTypes from '#/types/room.types';
import type * as RunTypes from '#/types/run.types';
import type { TenantEvent, TenantSocketsCloseParams } from '#/types/tenant.types';
import type { CloudflareBindings } from './types/cloudflare.types';
import type * as MemoryCaptureTypes from './types/memory-capture.types';
import type * as MemoryStateTypes from './types/memory-state.types';
import type { MemoryWipeInput } from './types/memory.types';
import type { Services } from './types/services.types';
import type { TenantServices } from './types/tenant.types';

export function makeCloudflareServices(bindings: CloudflareBindings): Services {
  const env = envServer(process.env);

  return makeServices({
    env,
    database: { main: makeDatabaseD1Service({ d1: bindings.DB, env }) },
    storage: makeStorageService({ driver: 'cloudflare', bucket: bindings.FILES }),
    tenants: bindings.TENANT,
    rateLimiters: {
      rpc: makeRateLimiterService({ driver: 'cloudflare', binding: bindings.RPC_RATE_LIMITER }),
      auth: makeRateLimiterService({ driver: 'cloudflare', binding: bindings.AUTH_RATE_LIMITER }),
      ingest: makeRateLimiterService({ driver: 'cloudflare', binding: bindings.INGEST_RATE_LIMITER }),
    },
  });
}

export class TenantObject extends DurableObject<CloudflareBindings> {
  private readonly services: TenantServices;

  constructor(ctx: DurableObjectState, bindings: CloudflareBindings) {
    super(ctx, bindings);
    const env = envServer(process.env);
    const databaseTenant = makeDatabaseDurableService(ctx.storage);

    databaseTenant.migrate();
    this.services = makeTenantServices({
      env,
      database: {
        main: makeDatabaseD1Service({ d1: bindings.DB, env }),
        tenant: databaseTenant,
      },
      storage: makeStorageService({ driver: 'cloudflare', bucket: bindings.FILES }),
      organizationId: ctx.id.name ?? '',
      sockets: {
        broadcast: (event) => {
          const message = JSON.stringify(event);

          for (const socket of ctx.getWebSockets(TENANT.browserTag).filter((item) => item.readyState === WebSocket.OPEN)) {
            socket.send(message);
          }
        },
        daemon: () => {
          const socket = ctx
            .getWebSockets(TENANT.daemonTag)
            .filter((item) => item.readyState === WebSocket.OPEN)
            .at(-1);

          const attachment = daemonAttachment.safeParse(socket?.deserializeAttachment());

          if (!socket || !attachment.success) {
            return undefined;
          }

          return {
            harnessIds: attachment.data.harnessIds,
            maxTurns: attachment.data.maxTurns,
            send: (message) => socket.send(JSON.stringify(message)),
            close: () => socket.close(TENANT.unresponsiveCloseCode, 'unresponsive'),
          };
        },
        closeDaemons: () => {
          for (const socket of ctx.getWebSockets(TENANT.daemonTag)) {
            socket.close(TENANT.daemonReplacedCloseCode, 'replaced');
          }
        },
        revoke: (tag) => {
          const sockets = ctx.getWebSockets(tag).filter((socket) => socket.readyState === WebSocket.OPEN);

          for (const socket of sockets) {
            socket.close(TENANT.revokedCloseCode, 'revoked');
          }

          return sockets.some((socket) => ctx.getTags(socket).includes(TENANT.daemonTag));
        },
      },
      alarm: { set: (at) => void ctx.storage.setAlarm(at) },
      enter: (operation) => Promise.resolve().then(operation),
      exclusive: async (operation) => {
        const outcome = await ctx.blockConcurrencyWhile(async () => {
          try {
            return { success: true as const, value: await operation() };
          } catch (error) {
            return { success: false as const, error };
          }
        });

        if (!outcome.success) {
          throw outcome.error;
        }

        return outcome.value;
      },
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
    this.services.run.actions.arm();
  }

  fetch(request: Request): Response {
    const owner = request.headers.get(TENANT.ownerHeader);

    if (!owner) {
      return new Response(null, { status: 401 });
    }

    const pair = new WebSocketPair();
    const isDaemon = new URL(request.url).pathname === TENANT.daemonSocketPath;

    if (isDaemon) {
      this.services.harness.actions.connect();
    }

    this.ctx.acceptWebSocket(pair[1], [isDaemon ? TENANT.daemonTag : TENANT.browserTag, owner]);

    if (!isDaemon) {
      pair[1].send(JSON.stringify({ type: 'tenant.connected' } satisfies TenantEvent));
    }

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (data instanceof ArrayBuffer || !this.ctx.getTags(socket).includes(TENANT.daemonTag)) {
      return;
    }

    await this.services.calls.daemonMessage({
      data,
      socket: {
        current: () => socket === this.ctx.getWebSockets(TENANT.daemonTag).filter((item) => item.readyState === WebSocket.OPEN).at(-1),
        send: (message) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
          }
        },
        attach: (attachment) => socket.serializeAttachment(attachment),
        close: (code, reason) => socket.close(code, reason),
      },
    });
  }

  webSocketClose(socket: WebSocket): void {
    if (this.ctx.getTags(socket).includes(TENANT.daemonTag)) {
      this.services.harness.actions.closed({ othersOpen: this.ctx.getWebSockets(TENANT.daemonTag).some((item) => item !== socket) });
    }
  }

  socketsClose(params: TenantSocketsCloseParams) {
    return this.services.calls.socketsClose(params);
  }

  alarm(): Promise<void> {
    return this.services.calls.alarm();
  }

  daemonHarnesses() {
    return this.services.calls.daemonHarnesses();
  }

  daemonSkills(params: HarnessActionListSkillsParams) {
    return this.services.calls.daemonSkills(params);
  }

  daemonModels(params: HarnessActionListModelsParams) {
    return this.services.calls.daemonModels(params);
  }

  memoryStatus(params: MemoryCaptureTypes.MemoryCaptureQueryStatusParams) {
    return this.services.calls.memoryStatus(params);
  }

  memoryControl(params: MemoryCaptureTypes.MemoryCaptureControlInput) {
    return this.services.calls.memoryControl(params);
  }

  memoryList(params: MemoryStateTypes.MemoryStateQueryListParams) {
    return this.services.calls.memoryList(params);
  }

  memoryExport(params: MemoryStateTypes.MemoryStateQueryExportParams) {
    return this.services.calls.memoryExport(params);
  }

  memoryWipe(params: MemoryWipeInput) {
    return this.services.calls.memoryWipe(params);
  }

  memoryMutate(params: MemoryStateTypes.MemoryStateActionMutateParams) {
    return this.services.calls.memoryMutate(params);
  }

  roomList() {
    return this.services.calls.roomList();
  }

  roomGet(params: RoomTypes.RoomQueryGetParams) {
    return this.services.calls.roomGet(params);
  }

  roomTimeline(params: RoomTypes.RoomQueryTimelineParams) {
    return this.services.calls.roomTimeline(params);
  }

  roomHistory(params: RoomTypes.RoomQueryHistoryParams) {
    return this.services.calls.roomHistory(params);
  }

  roomReactions(params: RoomTypes.RoomQueryReactionsParams) {
    return this.services.calls.roomReactions(params);
  }

  roomCreate(params: RoomTypes.RoomActionCreateParams) {
    return this.services.calls.roomCreate(params);
  }

  roomOpenTeam(params: RoomTypes.RoomActionOpenTeamParams) {
    return this.services.calls.roomOpenTeam(params);
  }

  roomOpenDirect(params: RoomTypes.RoomActionOpenDirectParams) {
    return this.services.calls.roomOpenDirect(params);
  }

  roomReset(params: RoomTypes.RoomActionResetParams) {
    return this.services.calls.roomReset(params);
  }

  roomDelete(params: RoomTypes.RoomActionDeleteParams) {
    return this.services.calls.roomDelete(params);
  }

  botDelete(params: RoomTypes.RoomActionDeleteBotParams) {
    return this.services.calls.botDelete(params);
  }

  roomUpdate(params: RoomTypes.RoomActionUpdateParams) {
    return this.services.calls.roomUpdate(params);
  }

  roomArrange(params: RoomTypes.RoomActionArrangeParams) {
    return this.services.calls.roomArrange(params);
  }

  roomSend(params: RoomTypes.RoomActionSendParams) {
    return this.services.calls.roomSend(params);
  }

  roomAddFile(params: RoomTypes.RoomActionAddFileParams) {
    return this.services.calls.roomAddFile(params);
  }

  roomRemoveFile(params: RoomTypes.RoomActionRemoveFileParams) {
    return this.services.calls.roomRemoveFile(params);
  }

  roomFile(params: RoomTypes.RoomQueryFileParams) {
    return this.services.calls.roomFile(params);
  }

  roomRerun(params: RoomTypes.RoomActionRerunParams) {
    return this.services.calls.roomRerun(params);
  }

  roomAddReaction(params: RoomTypes.RoomActionAddReactionParams) {
    return this.services.calls.roomAddReaction(params);
  }

  roomRemoveReaction(params: RoomTypes.RoomActionRemoveReactionParams) {
    return this.services.calls.roomRemoveReaction(params);
  }

  runStop(params: RunTypes.RunActionStopParams) {
    return this.services.calls.runStop(params);
  }

  runDrafts(params: RunTypes.RunQueryDraftsParams) {
    return this.services.calls.runDrafts(params);
  }

  runRetry(params: RunTypes.RunActionRetryParams) {
    return this.services.calls.runRetry(params);
  }

  runCancel(params: RunTypes.RunActionCancelParams) {
    return this.services.calls.runCancel(params);
  }

  runApprove(params: RunTypes.RunActionApproveParams) {
    return this.services.calls.runApprove(params);
  }
}
