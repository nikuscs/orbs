import type { Bot } from './bot.types';
import type { DatabaseTenant, DatabaseTenantRun } from './database-tenant.types';
import type { McpInternalBotCall, McpInternalCall, McpInternalGroupCall } from './mcp-internal.types';
import type { TenantServices } from './tenant.types';

export interface McpInternalServiceDeps extends Pick<
  TenantServices,
  'bots' | 'room' | 'run' | 'harness' | 'route' | 'sockets' | 'memoryState'
> {
  database: DatabaseTenant;
  organizationId: string;
}

export interface McpInternalActionCallParams {
  runId: string;
  call: McpInternalCall;
}

export interface McpInternalCaller {
  run: DatabaseTenantRun;
  bot: Bot;
}

export interface McpInternalActionMemoryParams {
  caller: McpInternalCaller;
  call: Extract<
    McpInternalCall,
    { name: 'memory_list' | 'memory_search' | 'memory_save' | 'memory_update' | 'memory_forget' | 'room_history' }
  >;
}

export interface McpInternalActionBotParams {
  caller: McpInternalCaller;
  call: McpInternalBotCall;
}

export interface McpInternalActionGroupParams {
  caller: McpInternalCaller;
  call: McpInternalGroupCall;
}
