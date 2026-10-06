import { z } from 'zod';
import type { HarnessAnswerParams, HarnessTurnParams } from '#/types/harness.types';
import type { McpServerConfig } from '@earendil-works/pi-coding-agent';
import type { DaemonPiProblem } from '@orbs/server/daemon';

export const piMcpFile = z.object({
  mcpServers: z.record(
    z.string(),
    z.custom<McpServerConfig>((value) => z.looseObject({}).safeParse(value).success),
  ),
});

export const piUserSettings = z.looseObject({
  packages: z.array(z.json()).optional(),
  extensions: z.array(z.string()).optional(),
});

export type PiPluginSettings = Pick<z.infer<typeof piUserSettings>, 'packages' | 'extensions'>;

export interface PiStampedFiles {
  agentsFile: boolean;
  skills: boolean;
  mcp: boolean;
}

export interface PiContextFile {
  path: string;
  content: string;
}

interface PiApprovalGate {
  ungatedTools: string[];
}

export interface PiJudgeTool {
  name: string;
  handles: string[];
}

interface PiBridgeCommands {
  memory: string;
  catalogue: string;
}

export interface PiBridgeConfig {
  promptSections: Record<string, string>;
  contextFiles: PiContextFile[];
  mcpServers: Record<string, McpServerConfig>;
  approvalGate: PiApprovalGate | null;
  repeatedCallLimit: number;
  commands: PiBridgeCommands;
  judgeTool: PiJudgeTool | null;
}

export interface PiBridgeState {
  config: PiBridgeConfig | null;
  memorySections: Record<string, string>;
  lastToolCall: string;
  sameToolCalls: number;
}

export interface PiTempFiles {
  dir: string;
  bridgeWritten: Promise<string> | null;
}

const piJson = z.json();

export type PiJson = z.infer<typeof piJson>;

const piContentBlocks = z.array(z.object({ type: z.string(), text: z.string().optional() }));

const piContentEdge = z.object({
  type: z.enum(['text_start', 'text_end', 'thinking_start', 'thinking_end']),
  contentIndex: z.number(),
});

const piContentDelta = z.object({
  type: z.enum(['text_delta', 'thinking_delta']),
  contentIndex: z.number(),
  delta: z.string(),
});

export const piAssistantMessage = z.object({
  role: z.literal('assistant'),
  content: piContentBlocks,
  stopReason: z.string(),
  errorMessage: z.string().optional(),
  usage: z.object({
    input: z.number(),
    output: z.number(),
    cacheRead: z.number(),
    cacheWrite: z.number(),
    cost: z.object({ total: z.number() }),
  }),
});

export type PiAssistantMessage = z.infer<typeof piAssistantMessage>;

const piAgentEnd = z.object({
  type: z.literal('agent_end'),
  messages: z.array(z.looseObject({ role: z.string() })),
});

export type PiAgentEnd = z.infer<typeof piAgentEnd>;

const piUiRequest = z.object({
  type: z.literal('extension_ui_request'),
  id: z.string(),
  method: z.string(),
  title: z.string().optional(),
  message: z.string().optional(),
});

const piResponse = z.object({
  type: z.literal('response'),
  id: z.string().optional(),
  command: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  data: piJson.optional(),
});

export type PiResponse = z.infer<typeof piResponse>;

export const piOutputRecord = z.discriminatedUnion('type', [
  piResponse,
  piUiRequest,
  piAgentEnd,
  z.object({ type: z.enum(['turn_start', 'turn_end', 'agent_settled', 'compaction_start', 'compaction_end', 'auto_retry_start', 'auto_retry_end']) }),
  z.object({ type: z.literal('message_update'), assistantMessageEvent: z.discriminatedUnion('type', [piContentEdge, piContentDelta]) }),
  z.object({ type: z.literal('message_start'), message: z.object({ role: z.string(), content: z.union([z.string(), piContentBlocks]) }) }),
  z.object({
    type: z.literal('tool_execution_start'),
    toolCallId: z.string(),
    toolName: z.string(),
    args: piJson,
  }),
  z.object({
    type: z.literal('tool_execution_end'),
    toolCallId: z.string(),
    toolName: z.string(),
    isError: z.boolean(),
    result: piJson,
  }),
]);

export type PiEvent = Exclude<z.infer<typeof piOutputRecord>, PiResponse>;

export type PiContentEvent = Extract<PiEvent, { type: 'message_update' }>['assistantMessageEvent'];

interface PiPendingResponse {
  resolve: (response: PiResponse) => void;
  reject: (error: Error) => void;
}

export interface PiProcess {
  subprocess: Bun.Subprocess<'pipe', 'pipe', 'pipe'>;
  pendingResponses: Map<string, PiPendingResponse>;
  eventListeners: Set<(event: PiEvent) => void>;
  stoppedByDaemon: boolean;
  stderrTail: string;
}

export interface PiSpawnParams {
  args: string[];
  agentDir: string;
}

export type PiSpawnDeps = Pick<PiServiceDeps, 'workdir' | 'processEnv'>;

export type PiModelParams = Pick<HarnessTurnParams, 'modelProvider' | 'modelId' | 'thinkingLevel'>;

export interface PiAgentDirParams {
  name: string;
  botHome: string | null;
}

export interface PiWarmSessionParams {
  key: string;
  fingerprint: string;
  resume: string | null;
  spawn: PiSpawnParams;
  model: PiModelParams;
  onEvent: (piProcess: PiProcess, event: PiEvent) => void;
}

export const piState = z.object({
  sessionFile: z.string().optional(),
  model: z.object({ input: z.array(z.string()) }).optional(),
});

export const piSessionStats = z.object({
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    cacheRead: z.number(),
    cacheWrite: z.number(),
  }),
  cost: z.number(),
});

export type PiSessionStats = z.infer<typeof piSessionStats>;

export const piCommandList = z.object({ commands: z.array(z.object({ name: z.string(), source: z.string() })) });

export const piPromptAccepted = z.object({ disposition: z.enum(['started', 'queued', 'handled']) });

export const piToolResult = z.object({
  content: piContentBlocks,
});

export const piUserText = z.union([
  z.string(),
  piContentBlocks.transform((blocks) =>
    blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n'),
  ),
]);

export const piJudgeResult = z.object({ details: z.object({ handles: z.array(z.string()) }) });

export const piApprovalRequest = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  input: piJson,
});

export interface PiSteer {
  messageId: string;
  text: string;
}

export type PiApprovalAnswer = Pick<HarnessAnswerParams, 'approved' | 'reason'>;

export interface PiTurn {
  key: string;
  requestApproval: HarnessTurnParams['requestApproval'];
  approvals: Map<string, (answer: PiApprovalAnswer) => void>;
  piProcess: PiProcess | undefined;
  cancelled: boolean;
  pending: string[];
  steers: PiSteer[];
  steeredMessageIds: string[];
}

export type PiTurns = Map<string, PiTurn>;

export interface PiWarmSession {
  piProcess: PiProcess;
  fingerprint: string;
  sessionFile: string | null;
  idle: ReturnType<typeof setTimeout> | undefined;
}

export type PiSessions = Map<string, PiWarmSession>;

export interface PiStream {
  step: number;
}

export type PiJudging = Map<string, Promise<void>>;

export type PiProcessEnv = Record<string, string | undefined>;

export interface PiVersionCheck {
  problem: Promise<DaemonPiProblem | null> | null;
}

export interface PiServiceDeps {
  workdir: string;
  sharedHome: string;
  userAgentDir: string;
  processEnv: PiProcessEnv;
  tempFiles: PiTempFiles;
  versionCheck: PiVersionCheck;
  turns: PiTurns;
  sessions: PiSessions;
  judging: PiJudging;
}
