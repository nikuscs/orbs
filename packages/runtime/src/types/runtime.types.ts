import { artifactSpec, commandArguments, commandIdArguments, routineCreate, todo } from '@repo/contracts/universal';
import { z } from 'zod';
import { note } from './note.types';
import type { ActivityService } from '../services/activity/activity.service';
import type { ArtifactService } from '../services/artifact/artifact.service';
import type { NotificationService } from '../services/notification/notification.service';
import type { QuestionService } from '../services/question/question.service';
import type { RoutineService } from '../services/routine/routine.service';
import type { TodoService } from '../services/todo/todo.service';
import type { AlarmService } from './alarm.types';
import type { CollaborationDirectory, CollaborationPolicy } from './collaboration.types';
import type { ConversationIndexService } from './conversation-index.types';
import type { StorageService } from './storage.types';
import type { Draft, JsonValue } from '@earendil-works/chord';
import type { Context } from '@earendil-works/chord/context';
import type { ToolCall } from '@earendil-works/pi-ai';
import type { Models } from '@earendil-works/pi-ai/models';
import type * as PiDurableTypes from '@earendil-works/pi-durable';
import type { ImageProcessor } from '@earendil-works/pi-durable/tools';
import type * as UniversalTypes from '@repo/contracts/universal';

export interface RuntimeServiceParams {
  appName: string;
  storage: StorageService;
  alarm: AlarmService;
  models: Models;
  env: NonNullable<PiDurableTypes.HarnessOptions['env']>;
  permissions: RuntimeToolPolicy;
  collaboration: CollaborationPolicy;
  images?: ImageProcessor;
  secrets?: RuntimeSecrets;
  toolExtensions?: PiDurableTypes.Extension[];
}

export interface RuntimeSecrets {
  actions: {
    prepare: (execution: RuntimeSecretExecution) => Promise<void>;
  };
  queries: {
    rules: () => Promise<UniversalTypes.SecretRule[]>;
    redact: (params: RuntimeSecretRedactParams) => Promise<string>;
  };
}

export interface RuntimeSecretExecution {
  command: string;
  env: Record<string, string>;
}

export interface RuntimeSecretRedactParams {
  text: string;
}

export interface RuntimeCodingToolsParams {
  images?: ImageProcessor;
  secrets?: RuntimeSecrets;
}

export interface RuntimeSecretsParams {
  secrets: RuntimeSecrets;
}

export interface RuntimeToolPolicy {
  authorize(call: RuntimeToolCall, context: Context): Promise<RuntimeToolDecision>;
  approvalTimeoutMs(): Promise<number>;
}

export interface RuntimeToolsDeps extends Pick<RuntimeServiceDeps, 'harness' | 'readOnlyTools' | 'ownTools'> {
  permissions: RuntimeToolPolicy;
}

export interface RuntimeToolCall {
  botId: string;
  taskId: number;
  name: string;
  arguments: ToolCall['arguments'];
  isReadOnly: boolean;
  isOwn: boolean;
  getRequest: () => Promise<string>;
  approved?: boolean;
}

export interface RuntimeModelsDeps {
  models: Models;
}

export interface RuntimeSharedDeps extends RuntimeModelsDeps {
  appName: string;
  storage: StorageService;
  alarm: AlarmService;
  env: RuntimeServiceParams['env'];
  permissions: RuntimeToolPolicy;
  extensions: PiDurableTypes.Extension[];
  readOnlyTools: PiDurableTypes.ToolRegistration[];
  ownTools: PiDurableTypes.ToolRegistration[];
  directory: CollaborationDirectory;
}

export interface RuntimeServiceDeps extends RuntimeModelsDeps {
  appName: string;
  botId: string;
  directory: CollaborationDirectory;
  harness: PiDurableTypes.Harness;
  questions: QuestionService;
  routines: RoutineService;
  todos: TodoService;
  artifacts: ArtifactService;
  activity: ActivityService;
  index: ConversationIndexService;
  registry: PiDurableTypes.Registry;
  readOnlyTools: PiDurableTypes.ToolRegistration[];
  ownTools: PiDurableTypes.ToolRegistration[];
  extensions: PiDurableTypes.Extension[];
}

export interface RuntimeCarryOverDeps extends RuntimeServiceDeps {
  storage: StorageService;
}

export interface RuntimeCarryOverParams {
  conversationId: PiDurableTypes.ConversationId;
}

export interface RuntimeBot {
  deps: RuntimeServiceDeps;
  notifications: NotificationService;
  wake(): void;
  close(): Promise<void>;
}

export type RuntimeBotChange = { type: 'opened'; bot: RuntimeBot } | { type: 'closed'; botId: string; isFailed: boolean };

export interface RuntimeDirectory extends CollaborationDirectory {
  bot(botId: string): Promise<RuntimeBot>;
  opened(): RuntimeBot[];
  onChange(listener: (change: RuntimeBotChange) => void): () => void;
}

export interface RuntimeBotParams extends UniversalTypes.ModelSelection {
  id: string;
  fallbackModel?: UniversalTypes.ModelSelection | null;
  instructions: string;
  skillsPrompt: string;
  instructionFiles: { path: string; content: string }[];
  plugins: PiDurableTypes.Extension[];
  tools: PiDurableTypes.ToolRegistration[];
  permission: 'read-only' | 'ask' | 'auto' | 'full';
}

export type RuntimeModelParams = Pick<RuntimeBotParams, 'modelProvider' | 'modelId' | 'thinkingLevel' | 'fallbackModel'>;

export interface RuntimeBotBinding extends PiDurableTypes.JsonObject {
  conversationId: PiDurableTypes.ConversationId | null;
}

export interface RuntimeConversationParams {
  botId: string;
  conversationId?: number;
}

export interface RuntimeContextParams {
  record: PiDurableTypes.ConversationRecord;
  sourceConversationId: PiDurableTypes.ConversationId;
  isRunning: boolean;
}

export interface RuntimeEntryParams {
  botId: string;
  entryId: number;
}

export interface RuntimeSubmissionParams extends RuntimeConversationParams {
  requestId: string;
}

export interface RuntimeUpdateSubmissionParams extends RuntimeConversationParams {
  submissionId: number;
  replyToEntryId?: number | null;
  content?: string;
  whenBusy?: 'followUp' | 'steer' | 'interrupt';
  attachments?: UniversalTypes.Attachment[];
  skills?: RuntimeMessageSkills;
}

export interface RuntimeMessageSkills {
  names: string[];
  prompt: string;
}

export interface RuntimeMessageExtras {
  attachments?: UniversalTypes.Attachment[];
  replyTo?: UniversalTypes.ReplyQuote;
  skills?: RuntimeMessageSkills;
}

type RuntimeSubmitBase = Omit<PiDurableTypes.InputSubmissionDraft, 'type' | 'requestId' | 'whenBusy' | 'entry'>
  & RuntimeConversationParams
  & { requestId: string; attachments?: UniversalTypes.Attachment[]; replyToEntryId?: number; skills?: RuntimeMessageSkills };

export type RuntimeSubmitParams =
  | (RuntimeSubmitBase & { whenBusy: 'interrupt'; entry?: never })
  | (RuntimeSubmitBase & {
    whenBusy?: 'followUp' | 'steer' | 'reject';
    entry?: PiDurableTypes.InputEntry;
  });

export type RuntimeInterruptDraft = Pick<Extract<RuntimeSubmitParams, { whenBusy: 'interrupt' }>, 'requestId' | 'content'> & { entry?: PiDurableTypes.InputEntry };

export interface RuntimeHistoryParams extends RuntimeConversationParams {
  limit?: number;
  cursor?: PiDurableTypes.Cursor;
  afterEntryId?: number;
  throughEntryId?: number;
}

export type RuntimeToolDecision = 'allow' | 'deny' | 'ask';

export interface RuntimeApprovalAnswer extends RuntimeConversationParams {
  id: number;
  approved: boolean;
  answeredBy: string;
}

export interface RuntimeApproval extends PiDurableTypes.JsonObject {
  id: number;
  botId: string;
  toolName: string;
  arguments: PiDurableTypes.JsonObject;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'allowed' | 'denied' | 'expired';
  answeredAt: number | null;
  answeredBy: string | null;
}

export interface RuntimeApprovalRequest {
  call: RuntimeToolCall;
  taskId: PiDurableTypes.TaskId;
  timeoutMs: number;
  context: Context;
}

export interface RuntimeQuestionAnswer extends RuntimeConversationParams {
  id: number;
  answer: UniversalTypes.QuestionAnswer;
  answeredBy: string;
}

export interface RuntimeContextInput {
  context: Context;
}

export type RuntimeBotOperation<P, R> = (deps: RuntimeServiceDeps, params: P & RuntimeContextInput) => Promise<R> | R;

export type RuntimeBotFailure = Extract<PiDurableTypes.SessionEnd, { reason: 'failed' }>;

export interface RuntimeDirectoryParams {
  open: (botId: string) => Promise<RuntimeBot>;
}

export interface RuntimeWatchSource<T> {
  state: { value: T; subscribe: (listener: (value: T) => void) => () => void };
  closed: Promise<PiDurableTypes.WatchEnd>;
  stop: () => Promise<PiDurableTypes.WatchEnd>;
}

export interface RuntimeWatchMergeParams<T, S extends object> {
  directory: RuntimeDirectory;
  initial: S;
  attach: (bot: RuntimeBot, context: Context) => Promise<RuntimeWatchSource<T>>;
  apply: (draft: Draft<S>, botId: string, value: T | null) => void;
  context: Context;
}

export interface RuntimeToolApprovalDocument extends PiDurableTypes.JsonObject {
  approval: RuntimeApproval | null;
}

export interface RuntimeBotIdentity extends PiDurableTypes.JsonObject {
  botId: string | null;
  skillsPrompt: string;
}

export interface RuntimeToolTarget {
  botId: string;
  conversationId: PiDurableTypes.ConversationId;
}

export interface RuntimeQuoteParams extends RuntimeContextInput {
  conversationId: PiDurableTypes.ConversationId;
  entryId: number | null | undefined;
}

export interface RuntimeRetryParams extends RuntimeContextInput {
  conversationId: PiDurableTypes.ConversationId;
  taskId: PiDurableTypes.TaskId<JsonValue>;
}

export interface RuntimeInterruptParams extends RuntimeInterruptDraft, RuntimeContextInput {
  conversationId: PiDurableTypes.ConversationId;
}

export const runtimePrivateCursor = z.object({ offset: z.number().int().nonnegative() });

export const runtimeCommandArgumentsSchema = z.record(z.string(), z.json()).parse(z.toJSONSchema(commandArguments));

export const runtimeCommandIdArgumentsSchema = z.record(z.string(), z.json()).parse(z.toJSONSchema(commandIdArguments));

export const runtimeCarry = z.object({
  routines: z.array(routineCreate.omit({ botId: true }).extend({ id: z.uuid() })),
  artifacts: z.array(z.object({
    id: z.uuid(),
    title: z.string(),
    spec: artifactSpec,
  })),
  todos: z.array(todo.pick({
    id: true,
    title: true,
    isDone: true,
  })),
  notes: z.array(note).default([]),
});

export type RuntimeCarry = z.infer<typeof runtimeCarry>;
