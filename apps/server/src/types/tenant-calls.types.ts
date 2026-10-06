import type { DaemonAttachment, DaemonServerMessage } from '#/types/daemon.types';
import type { TenantServicesDeps, TenantSockets } from '#/types/tenant.types';
import type { HarnessService } from '#services/harness/harness.service';
import type { McpInternalService } from '#services/mcp-internal/mcp-internal.service';
import type { MemoryCaptureService } from '#services/memory-capture/memory-capture.service';
import type { MemoryStateService } from '#services/memory-state/memory-state.service';
import type { RoomService } from '#services/room/room.service';
import type { RouteService } from '#services/route/route.service';
import type { RunService } from '#services/run/run.service';

export type TenantCallsOperation<T> = () => T | PromiseLike<T>;

export type TenantCallsGate = <T>(operation: TenantCallsOperation<T>) => Promise<T>;

export interface TenantCallsDaemonSocket {
  current: () => boolean;
  send: (message: DaemonServerMessage) => void;
  attach: (attachment: DaemonAttachment) => void;
  close: (code: number, reason: string) => void;
}

export interface TenantCallsServiceDeps {
  enter: TenantCallsGate;
  exclusive: TenantCallsGate;
  waitUntil: TenantServicesDeps['waitUntil'];
  sockets: TenantSockets;
  harness: HarnessService;
  memoryCapture: MemoryCaptureService;
  memoryState: MemoryStateService;
  mcpInternal: McpInternalService;
  room: RoomService;
  route: RouteService;
  run: RunService;
}

export interface TenantCallsDaemonMessageParams {
  socket: TenantCallsDaemonSocket;
  data: string;
}
