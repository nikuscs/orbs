import { z } from 'zod';
import type { Database } from './database.types';

export const memoryScope = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('global'), ownerId: z.literal('') }),
  z.object({ scope: z.literal('bot'), ownerId: z.string().min(1).max(128) }),
  z.object({ scope: z.literal('room'), ownerId: z.string().min(1).max(128) }),
]);

export type MemoryScope = z.infer<typeof memoryScope>;

export const memorySubject = z.object({ kind: z.enum(['user', 'bot', 'room']), id: z.string().min(1).max(128) });

const memorySource = z.object({
  roomId: z.string(),
  messageId: z.string(),
  seq: z.int().positive(),
  authorId: z.string(),
});

export const memorySources = z.array(memorySource).max(500);
export type MemorySource = z.infer<typeof memorySource>;

export const memoryListInput = z.object({
  scope: memoryScope,
  query: z.string().max(200).default(''),
  before: z.string().optional(),
  limit: z.int().min(1).max(100).default(30),
});

export const memorySaveInput = z.object({
  operationId: z.string().min(1).max(128),
  scope: memoryScope,
  subject: memorySubject,
  text: z.string().trim().min(1).max(500),
  sourceMessageIds: z.array(z.string()).max(50).default([]),
});

export const memoryUpdateInput = memorySaveInput.omit({ subject: true }).extend({
  id: z.string(),
  expectedRevision: z.int().positive(),
  merge: z.array(z.object({ id: z.string(), expectedRevision: z.int().positive() })).max(8).optional(),
});

export const memoryForgetInput = z.object({
  operationId: z.string().min(1).max(128),
  scope: memoryScope,
  id: z.string(),
  expectedRevision: z.int().positive(),
});

export const memoryShareInput = memoryForgetInput.extend({ destination: memoryScope });
export type MemoryListInput = z.infer<typeof memoryListInput>;
export type MemorySaveInput = z.infer<typeof memorySaveInput>;
export type MemoryUpdateInput = z.infer<typeof memoryUpdateInput>;
export type MemoryForgetInput = z.infer<typeof memoryForgetInput>;
export type MemoryShareInput = z.infer<typeof memoryShareInput>;

export interface MemoryServiceDeps {
  database: Database;
}
export interface MemoryQueryListParams extends MemoryListInput {
  organizationId: string;
}
export interface MemoryActionSaveParams extends Omit<MemorySaveInput, 'sourceMessageIds'> {
  organizationId: string;
  actorId: string;
  origin: 'manual' | 'automatic';
  sources: MemorySource[];
}
export interface MemoryActionUpdateParams extends Omit<MemoryUpdateInput, 'sourceMessageIds'> {
  organizationId: string;
  sources: MemorySource[];
}
export interface MemoryActionForgetParams extends MemoryForgetInput {
  organizationId: string;
}
export interface MemoryActionShareParams extends MemoryShareInput {
  organizationId: string;
}
export interface MemoryQueryGetParams {
  organizationId: string;
  id: string;
}
export interface MemoryQueryExportParams {
  organizationId: string;
  after?: string;
}
export interface MemoryReceipt {
  memoryId: string;
  revision: number;
}

export interface MemoryQuerySuppressedParams {
  organizationId: string;
  sourceIds: string[];
}

export interface MemoryQueryCandidatesParams {
  organizationId: string;
  roomId: string;
  subjectIds: string[];
}

export const memoryWipeInput = z.object({
  operationId: z.string().min(1).max(128),
  scope: z.object({ scope: z.enum(['bot', 'room']), ownerId: z.string().min(1).max(128) }),
});

export type MemoryWipeInput = z.infer<typeof memoryWipeInput>;
export interface MemoryActionWipeParams extends MemoryWipeInput {
  organizationId: string;
}

export const memoryWipeSearch = z.object({ from: z.enum(['settings', 'room']).catch('settings') });
