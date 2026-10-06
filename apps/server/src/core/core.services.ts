import { TypeSafeClient } from '@typesafe-ai/sdk';
import { makeAuthService } from '#services/auth/auth.service';
import { makeBotService } from '#services/bot/bot.service';
import { makeHarnessService } from '#services/harness/harness.service';
import { makeMailService } from '#services/mail/mail.service';
import { makeMcpInternalService } from '#services/mcp-internal/mcp-internal.service';
import { makeMemoryCaptureService } from '#services/memory-capture/memory-capture.service';
import { makeMemoryStateService } from '#services/memory-state/memory-state.service';
import { makeMemoryService } from '#services/memory/memory.service';
import { ORGANIZATION } from '#services/organization/organization.constants';
import { makeOrganizationService } from '#services/organization/organization.service';
import { makeRoomService } from '#services/room/room.service';
import { makeRouteDriversService } from '#services/route/route-drivers.service';
import { ROUTE_JEV } from '#services/route/route.constants';
import { makeRouteService } from '#services/route/route.service';
import { makeRunService } from '#services/run/run.service';
import { makeTenantCallsService } from '#services/tenant/tenant-calls.service';
import { makeTenantService } from '#services/tenant/tenant.service';
import { createContainer } from './core.container';
import type { Services, ServicesDeps } from '#/types/services.types';
import type { TenantServices, TenantServicesDeps } from '#/types/tenant.types';
import type { Factories } from './core.container';

function serviceFactories(deps: ServicesDeps): Factories<Services> {
  return {
    env: () => deps.env,
    database: () => deps.database,
    rateLimiters: () => deps.rateLimiters,
    mail: (services) => makeMailService({ env: services.env }),
    organization: (services) => makeOrganizationService({ database: services.database.main }),
    auth: (services) =>
      makeAuthService({
        env: services.env,
        database: { db: services.database.main.db, type: 'sqlite' },
        mail: services.mail,
        organization: services.organization,
        disconnect: (params) => services.tenant.actions.disconnect(params),
      }),
    bot: (services) => makeBotService({ database: services.database.main }),
    storage: () => deps.storage,
    tenant: (services) =>
      makeTenantService({
        namespace: deps.tenants,
        auth: services.auth,
        bot: services.bot,
        storage: services.storage,
      }),
  };
}

export function makeServices(deps: ServicesDeps, overrides?: Partial<Factories<Services>>): Services {
  return createContainer(serviceFactories(deps), overrides);
}

export function makeTenantServices(deps: TenantServicesDeps, overrides?: Partial<Factories<TenantServices>>): TenantServices {
  return createContainer<TenantServices>(
    {
      database: () => deps.database,
      memory: () => makeMemoryService({ database: deps.database.main }),
      memoryCapture: (services) =>
        makeMemoryCaptureService({
          instructions: services.run.queries.extractionPrompt,
          database: services.database.tenant,
          memory: services.memory,
          organizationId: deps.organizationId,
          sockets: services.sockets,
          alarm: services.alarm,
          organization: services.organization,
          memoryState: services.memoryState,
        }),
      memoryState: (services) =>
        makeMemoryStateService({
          render: services.run.queries.memoryPrompt,
          database: services.database.tenant,
          memory: services.memory,
          bots: services.bots,
          organizationId: deps.organizationId,
          sockets: services.sockets,
          alarm: services.alarm,
        }),
      sockets: () => deps.sockets,
      alarm: () => deps.alarm,
      bots: () => makeBotService({ database: deps.database.main }),
      storage: () => deps.storage,
      jev: () =>
        new TypeSafeClient({
          apiKey: deps.env.TYPESAFE_API_KEY,
          logLevel: 'warn',
          timeout: ROUTE_JEV.timeout,
          retry: { maxRetries: 1 },
          fetch: (input, init) => fetch(input, init),
        }),
      organization: () => makeOrganizationService({ database: deps.database.main }),
      judgeRequests: () => new Map(),
      drivers: (services) =>
        makeRouteDriversService({
          database: services.database.tenant,
          jev: services.jev,
          sockets: services.sockets,
          requests: services.judgeRequests,
        }),
      route: (services) =>
        makeRouteService({
          database: services.database.tenant,
          bot: services.bots,
          organization: services.organization,
          jev: services.jev,
          drivers: services.drivers,
          judgeRequests: services.judgeRequests,
          organizationId: deps.organizationId,
          cache: { bots: [], settings: ORGANIZATION.settings, loadedAt: 0 },
        }),
      run: (services) =>
        makeRunService({
          database: services.database.tenant,
          sockets: services.sockets,
          alarm: services.alarm,
          route: services.route,
          routing: new Set(),
        }),
      harness: (services) =>
        makeHarnessService({
          database: services.database.tenant,
          sockets: services.sockets,
          run: services.run,
          skillRequests: new Map(),
          modelRequests: new Map(),
        }),
      mcpInternal: (services) =>
        makeMcpInternalService({
          memoryState: services.memoryState,
          database: services.database.tenant,
          organizationId: deps.organizationId,
          bots: services.bots,
          room: services.room,
          run: services.run,
          harness: services.harness,
          route: services.route,
          sockets: services.sockets,
        }),
      room: (services) =>
        makeRoomService({
          bot: services.bots,
          route: services.route,
          organizationId: deps.organizationId,
          database: services.database.tenant,
          sockets: services.sockets,
          run: services.run,
          storage: services.storage,
          waitUntil: deps.waitUntil,
        }),
      calls: (services) =>
        makeTenantCallsService({
          enter: deps.enter,
          exclusive: deps.exclusive,
          waitUntil: deps.waitUntil,
          sockets: services.sockets,
          harness: services.harness,
          memoryCapture: services.memoryCapture,
          memoryState: services.memoryState,
          mcpInternal: services.mcpInternal,
          room: services.room,
          route: services.route,
          run: services.run,
        }),
    },
    overrides,
  );
}
