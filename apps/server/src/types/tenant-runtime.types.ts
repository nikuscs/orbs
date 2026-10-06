import type { DaemonAttachment } from '#/types/daemon.types';
import type { Database } from '#/types/database.types';
import type { TenantDirectory } from '#/types/tenant.types';
import type { StorageService } from '#services/storage/storage.service';
import type { TenantCallsService } from '#services/tenant/tenant-calls.service';
import type { EnvServer } from '@orbs/env/server';

export interface TenantRuntimeSocket {
  send: (data: string) => void;
  close: (code: number, reason: string) => void;
}

export interface TenantRuntimeSocketEntry {
  socket: TenantRuntimeSocket;
  tags: string[];
  open: boolean;
  attachment: DaemonAttachment | null;
}

export interface TenantRuntimeConnectParams {
  socket: TenantRuntimeSocket;
  daemon: boolean;
  ownerTag: string;
}

export interface TenantRuntimeConnection {
  message: (data: string) => void;
  closed: () => void;
}

export interface TenantRuntimeSocketData {
  organizationId: string;
  ownerTag: string;
  daemon: boolean;
  connection: TenantRuntimeConnection | null;
}

export interface TenantRuntimeQueue {
  items: { run: () => void; cancel: () => void }[];
  scheduled: boolean;
  holding: boolean;
  disposed: boolean;
}

export interface TenantRuntimeAlarm {
  at: number | null;
  version: number;
  notBefore: number;
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
  failures: number;
}

export interface TenantRuntimeDeps {
  organizationId: string;
  path: string;
  database: { main: Database };
  storage: StorageService;
  env: EnvServer;
}

export type TenantRuntimeDirectoryDeps = Omit<TenantRuntimeDeps, 'organizationId'>;

export interface TenantRuntime {
  ready: Promise<void>;
  calls: TenantCallsService;
  connect: (params: TenantRuntimeConnectParams) => TenantRuntimeConnection;
  dispose: () => Promise<void>;
}

export interface TenantRuntimeDirectory extends TenantDirectory {
  start: () => Promise<void>;
  connect: (organizationId: string, params: TenantRuntimeConnectParams) => TenantRuntimeConnection;
  dispose: () => Promise<void>;
}
