import { z } from 'zod';

export interface StorageObject {
  body: ReadableStream<Uint8Array>;
}

export interface StoragePage {
  keys: string[];
  prefixes: string[];
  cursor?: string;
}

export interface StorageDriver {
  get: (key: string) => Promise<StorageObject | null>;
  put: (params: { key: string; body: ReadableStream<Uint8Array>; contentType: string }) => Promise<void>;
  list: (params: StorageListParams) => Promise<StoragePage>;
  removeKeys: (keys: string[]) => Promise<void>;
}

export interface StorageDriverParams {
  root: string;
}

export const storageFileMissing = z.object({ code: z.literal('ENOENT') });

export type StorageServiceSource =
  | { driver: 'cloudflare'; bucket: R2Bucket }
  | { driver: 'disk'; root: string };

export interface StorageServiceDeps {
  driver: StorageDriver;
}

export interface StoragePutParams {
  organizationId: string;
  roomId: string;
  fileId: string;
  file: File;
}

export interface StorageGetParams {
  organizationId: string;
  roomId: string;
  fileId: string;
}

export interface StorageRemoveRoomParams {
  organizationId: string;
  roomId: string;
}

export interface StorageListParams {
  prefix: string;
  delimiter?: string;
  cursor?: string;
}

export interface StorageRemoveKeysParams {
  keys: string[];
}
