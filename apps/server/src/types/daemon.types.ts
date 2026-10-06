import { z } from 'zod';
import { botInheritResource, botPermission, botThinkingLevel } from '#/types/bot.types';
import { mcpInternalCall, mcpInternalResult } from './mcp-internal.types';
import { memoryExtractionResult } from './memory-extraction.types';
import type { UIMessage, UIMessageChunk } from 'ai';

const daemonStartFile = z.object({
  id: z.string(),
  name: z.string(),
  mediaType: z.string(),
  size: z.number(),
  path: z.string(),
});

export type DaemonStartFile = z.infer<typeof daemonStartFile>;

const daemonStartMessage = z.object({
  type: z.literal('run.start'),
  memory: z.object({
    global: z.string().nullable(),
    bot: z.string().nullable(),
    room: z.string().nullable(),
  }),
  runId: z.string(),
  roomId: z.string(),
  botId: z.string(),
  harnessId: z.string(),
  homeDir: z.string(),
  modelProvider: z.string(),
  modelId: z.string(),
  thinkingLevel: botThinkingLevel,
  permission: botPermission,
  directives: z.string(),
  instructions: z.string(),
  roomInstructions: z.string(),
  inherit: z.array(botInheritResource),
  prompt: z.string(),
  skills: z.array(z.string()),
  files: z.array(daemonStartFile),
  resume: z.string().nullable(),
});

export type DaemonStartMessage = z.infer<typeof daemonStartMessage>;

const daemonInterruptMessage = z.object({ type: z.literal('run.interrupt'), runId: z.string() });
export type DaemonInterruptMessage = z.infer<typeof daemonInterruptMessage>;

const daemonRoomDeletedMessage = z.object({
  type: z.literal('room.deleted'),
  roomId: z.string(),
  sessionFiles: z.array(z.string()),
});

const daemonRoomsAliveMessage = z.object({ type: z.literal('rooms.alive'), roomIds: z.array(z.string()) });

const daemonSteerMessage = z.object({
  type: z.literal('run.steer'),
  runId: z.string(),
  messageId: z.string(),
  text: z.string(),
});

export type DaemonSteerMessage = z.infer<typeof daemonSteerMessage>;

const daemonApprovalAnswerMessage = z.object({
  type: z.literal('run.approval.answer'),
  runId: z.string(),
  approvalId: z.string(),
  approved: z.boolean(),
  reason: z.string(),
});

export type DaemonApprovalAnswerMessage = z.infer<typeof daemonApprovalAnswerMessage>;

const daemonSkillsListMessage = z.object({
  type: z.literal('skills.list'),
  requestId: z.string(),
  homeDir: z.string(),
  inherit: z.array(botInheritResource),
});

export type DaemonSkillsListMessage = z.infer<typeof daemonSkillsListMessage>;

const daemonModelsListMessage = z.object({
  type: z.literal('models.list'),
  requestId: z.string(),
  harnessId: z.string(),
});

export type DaemonModelsListMessage = z.infer<typeof daemonModelsListMessage>;

const daemonJudgeMessage = z.object({
  type: z.literal('judge.decide'),
  requestId: z.string(),
  roomId: z.string(),
  harnessId: z.string(),
  modelProvider: z.string(),
  modelId: z.string(),
  thinkingLevel: botThinkingLevel,
  instructions: z.string(),
  prompt: z.string(),
  handles: z.array(z.string()).min(1),
  resume: z.string().nullable(),
});

export type DaemonJudgeMessage = z.infer<typeof daemonJudgeMessage>;

const daemonMcpResultMessage = mcpInternalResult.extend({ type: z.literal('mcp-internal.result'), requestId: z.string() });
export type DaemonMcpResultMessage = z.infer<typeof daemonMcpResultMessage>;

const daemonMemoryRequest = z.object({
  type: z.literal('memory.extract'),
  requestId: z.string(),
  roomId: z.string(),
  generation: z.string(),
  modelProvider: z.string(),
  modelId: z.string(),
  thinkingLevel: botThinkingLevel,
  instructions: z.string(),
  prompt: z.string(),
});

export type DaemonMemoryRequest = z.infer<typeof daemonMemoryRequest>;

export const daemonServerMessage = z.discriminatedUnion('type', [
  daemonStartMessage,
  daemonMemoryRequest,
  daemonInterruptMessage,
  daemonSteerMessage,
  daemonApprovalAnswerMessage,
  daemonRoomDeletedMessage,
  daemonRoomsAliveMessage,
  daemonSkillsListMessage,
  daemonModelsListMessage,
  daemonJudgeMessage,
  daemonMcpResultMessage,
]);

export type DaemonServerMessage = z.infer<typeof daemonServerMessage>;

const daemonEndStatus = z.enum(['completed', 'failed', 'cancelled']);
export type DaemonEndStatus = z.infer<typeof daemonEndStatus>;

export const daemonUsage = z.object({
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  cost: z.number(),
});

export type DaemonUsage = z.infer<typeof daemonUsage>;

const daemonModel = z.object({
  id: z.string(),
  name: z.string(),
  thinkingLevels: z.array(botThinkingLevel),
  images: z.boolean(),
});

const daemonProvider = z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(daemonModel),
});

export type DaemonProvider = z.infer<typeof daemonProvider>;

const daemonSkill = z.object({
  name: z.string(),
  description: z.string(),
  source: z.enum(['bot', 'shared']),
});

export type DaemonSkill = z.infer<typeof daemonSkill>;

const daemonPiProblem = z.discriminatedUnion('code', [
  z.object({ code: z.literal('pi_missing') }),
  z.object({
    code: z.literal('pi_outdated'),
    version: z.string(),
    minimum: z.string(),
  }),
]);

export type DaemonPiProblem = z.infer<typeof daemonPiProblem>;

const daemonHarnessProblem = z.discriminatedUnion('code', [
  ...daemonPiProblem.options,
  z.object({
    code: z.literal('daemon_protocol'),
    protocol: z.number().nullable(),
    required: z.number(),
  }),
]);

export type DaemonHarnessProblem = z.infer<typeof daemonHarnessProblem>;

export const daemonRunFailure = z.discriminatedUnion('code', [
  ...daemonPiProblem.options,
  z.object({ code: z.enum(['model_unavailable', 'model_error', 'pi_crashed', 'turn_error']), detail: z.string().nullable() }),
]);

export type DaemonRunFailure = z.infer<typeof daemonRunFailure>;

export const daemonHarness = z.object({
  harnessId: z.string(),
  providers: z.array(daemonProvider),
  problem: daemonHarnessProblem.nullable(),
});

export type DaemonHarness = z.infer<typeof daemonHarness>;

export const daemonHandshake = z.object({
  type: z.literal('daemon.ready'),
  protocol: z.number().optional(),
  harnesses: z.array(z.object({ harnessId: z.string() })),
});

export type DaemonHandshake = z.infer<typeof daemonHandshake>;

const daemonReadyMessage = z.object({
  type: z.literal('daemon.ready'),
  protocol: z.number(),
  harnesses: z.array(daemonHarness),
  maxTurns: z.number().int().min(1),
});

const daemonAcceptedMessage = z.object({ type: z.literal('run.accepted'), runId: z.string() });
export type DaemonAcceptedMessage = z.infer<typeof daemonAcceptedMessage>;

const daemonChunkMessage = z.object({
  type: z.literal('run.chunk'),
  runId: z.string(),
  chunk: z.custom<UIMessageChunk>(),
});

export type DaemonChunkMessage = z.infer<typeof daemonChunkMessage>;

const daemonEndMessage = z.object({
  type: z.literal('run.end'),
  runId: z.string(),
  status: daemonEndStatus,
  failure: daemonRunFailure.nullable(),
  parts: z.array(z.custom<UIMessage['parts'][number]>()),
  resume: z.string().nullable(),
  steeredMessageIds: z.array(z.string()),
  usage: daemonUsage.nullable(),
});

export type DaemonEndMessage = z.infer<typeof daemonEndMessage>;

const daemonApprovalMessage = z.object({
  type: z.literal('run.approval'),
  runId: z.string(),
  approvalId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});

export type DaemonApprovalMessage = z.infer<typeof daemonApprovalMessage>;

const daemonSkillsListedMessage = z.object({
  type: z.literal('skills.listed'),
  requestId: z.string(),
  skills: z.array(daemonSkill),
});

export type DaemonSkillsListedMessage = z.infer<typeof daemonSkillsListedMessage>;

const daemonModelsListedMessage = z.object({
  type: z.literal('models.listed'),
  requestId: z.string(),
  providers: z.array(daemonProvider),
});

export type DaemonModelsListedMessage = z.infer<typeof daemonModelsListedMessage>;

const daemonJudgedMessage = z.object({
  type: z.literal('judge.decided'),
  requestId: z.string(),
  handles: z.array(z.string()).nullable(),
  resume: z.string().nullable(),
  usage: daemonUsage.nullable(),
});

export type DaemonJudgedMessage = z.infer<typeof daemonJudgedMessage>;

const daemonMcpCallMessage = z.object({
  type: z.literal('mcp-internal.call'),
  requestId: z.string(),
  runId: z.string(),
  call: mcpInternalCall,
});

const daemonMemoryResult = z.object({
  type: z.literal('memory.extracted'),
  requestId: z.string(),
  roomId: z.string(),
  generation: z.string(),
  result: memoryExtractionResult.nullable(),
  error: z.enum(['unavailable', 'failed', 'busy', 'truncated', 'invalid_output']).nullable(),
  usage: daemonUsage.nullable(),
});

export type DaemonMemoryResult = z.infer<typeof daemonMemoryResult>;

export const daemonClientMessage = z.discriminatedUnion('type', [
  daemonMemoryResult,
  daemonReadyMessage,
  daemonAcceptedMessage,
  daemonChunkMessage,
  daemonApprovalMessage,
  daemonEndMessage,
  daemonSkillsListedMessage,
  daemonModelsListedMessage,
  daemonJudgedMessage,
  daemonMcpCallMessage,
]);

export type DaemonClientMessage = z.infer<typeof daemonClientMessage>;

export const daemonAttachment = z.object({ harnessIds: z.array(z.string()), maxTurns: z.number().int().min(1) });
export type DaemonAttachment = z.infer<typeof daemonAttachment>;
