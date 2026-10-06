import type { McpInternalConnection } from '#/types/mcp-internal.types';
import type * as DaemonTypes from '@orbs/server/daemon';
import type { UIMessageChunk } from 'ai';

export type HarnessApprovalRequest = Omit<DaemonTypes.DaemonApprovalMessage, 'type' | 'runId'>;

export interface HarnessTurnParams extends Omit<DaemonTypes.DaemonStartMessage, 'type'> {
  mcpInternal?: McpInternalConnection;
  emit: (chunk: UIMessageChunk) => void;
  requestApproval: (request: HarnessApprovalRequest) => void;
}

export interface HarnessTurnResult {
  status: DaemonTypes.DaemonEndStatus;
  failure: DaemonTypes.DaemonRunFailure | null;
  resume: string | null;
  steeredMessageIds: string[];
  usage: DaemonTypes.DaemonUsage | null;
}

export interface HarnessInterruptParams {
  runId: string;
}

export interface HarnessSteerParams {
  runId: string;
  messageId: string;
  text: string;
}

export type HarnessAnswerParams = Omit<DaemonTypes.DaemonApprovalAnswerMessage, 'type'>;

export interface HarnessDropParams {
  sessionFiles: string[];
}

export type HarnessJudgeParams = Omit<DaemonTypes.DaemonJudgeMessage, 'type' | 'requestId'>;

export type HarnessJudgeResult = Omit<DaemonTypes.DaemonJudgedMessage, 'type' | 'requestId'>;

export interface HarnessAdapter {
  extract: (params: DaemonTypes.DaemonMemoryRequest) => Promise<DaemonTypes.DaemonMemoryResult>;
  startTurn: (params: HarnessTurnParams) => Promise<HarnessTurnResult>;
  judge: (params: HarnessJudgeParams) => Promise<HarnessJudgeResult>;
  interrupt: (params: HarnessInterruptParams) => Promise<void>;
  steer: (params: HarnessSteerParams) => Promise<void>;
  answer: (params: HarnessAnswerParams) => void;
  drop: (params: HarnessDropParams) => Promise<void>;
  catalogue: () => Promise<DaemonTypes.DaemonProvider[]>;
  problem: () => Promise<DaemonTypes.DaemonPiProblem | null>;
  dispose: () => void;
}

export interface HarnessServiceDeps {
  adapters: Map<string, HarnessAdapter>;
}

export interface HarnessQueryGetParams {
  harnessId: string;
}
