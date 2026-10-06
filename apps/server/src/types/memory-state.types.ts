import { z } from 'zod';
import { memoryForgetInput, memorySaveInput, memoryShareInput, memoryUpdateInput } from './memory.types';
import type { BotService } from '#services/bot/bot.service';
import type { MemoryService } from '#services/memory/memory.service';
import type { DatabaseTenant } from './database-tenant.types';
import type { DatabaseMemoryTable } from './database.types';
import type * as MemoryTypes from './memory.types';
import type { TenantAlarm, TenantSockets } from './tenant.types';

export const memoryStateMutation = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), input: memorySaveInput }),
  z.object({ action: z.literal('update'), input: memoryUpdateInput }),
  z.object({ action: z.literal('forget'), input: memoryForgetInput }),
  z.object({ action: z.literal('share'), input: memoryShareInput }),
]);

export const memoryStateExportInput = z.object({ after: z.string().optional() });
export type MemoryStateMutation = z.infer<typeof memoryStateMutation>;
export interface MemoryStateServiceDeps {
  database: DatabaseTenant;
  render: (facts: Pick<DatabaseMemoryTable, 'id' | 'subjectKind' | 'subjectId' | 'text' | 'revision'>[]) => string;
  memory: MemoryService;
  bots: Pick<BotService, 'queries'>;
  organizationId: string;
  sockets: TenantSockets;
  alarm: TenantAlarm;
}
export interface MemoryStateActionMutateParams {
  actorId: string;
  mutation: MemoryStateMutation;
  roomId?: string;
  automatic?: boolean;
  deferRefresh?: boolean;
}
export interface MemoryStateQueryListParams extends MemoryTypes.MemoryListInput {
  includeSourceText?: boolean;
}
export interface MemoryStateQueryExportParams {
  after?: string;
}
export interface MemoryStateActionRefreshParams {
  scope: MemoryTypes.MemoryScope;
}
export interface MemoryStateQuerySourcesParams {
  roomId: string;
  ids: string[];
}
export interface MemoryStateQueryOwnerParams {
  scope: MemoryTypes.MemoryScope;
}
