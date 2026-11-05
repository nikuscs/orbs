import type { Context } from '@earendil-works/chord/context';
import type * as PiTypes from '@earendil-works/pi-durable';
import type * as ContractTypes from '@repo/contracts/universal';

export interface RoutineServiceDeps {
  harness: PiTypes.Harness;
}

export interface RoutineContextParams {
  context: Context;
}

export type RoutineRecord = ContractTypes.Routine & {
  taskId: PiTypes.TaskId<null>;
  revision: number;
  scheduleRevision: number;
  occurrence: number;
};

export interface RoutineDocument extends PiTypes.JsonObject {
  routines: Record<string, RoutineRecord>;
}

export interface RoutineConversationParams {
  conversationId: PiTypes.ConversationId;
}

export type RoutineCreateParams = ContractTypes.RoutineCreateInput & RoutineConversationParams & { id?: string };
export type RoutineUpdateParams = ContractTypes.RoutineUpdateInput & RoutineConversationParams;
export type RoutineTargetParams = ContractTypes.RoutineTarget & RoutineConversationParams;

export interface RoutineTaskInput {
  routineId: string;
}

export type RoutineTaskState =
  | { phase: 'check' }
  | { phase: 'wait'; until: number }
  | { phase: 'deliver'; scheduleRevision: number; occurrence: number; prompt: string; isManual: boolean };
