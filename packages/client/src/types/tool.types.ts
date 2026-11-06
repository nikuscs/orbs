import type { ChatMessage } from './chat.types';
import type { ToolEvent } from './tool-event.types';
import type * as UniversalTypes from '@repo/contracts/universal';
import type { DynamicToolUIPart } from 'ai';

export interface ToolSubagent extends UniversalTypes.ToolCallSubagent {
  conversationId?: number;
}

export interface ToolPeer {
  peer: UniversalTypes.Bot;
  conversationId: number | undefined;
}

type ToolMessagePart = ChatMessage['parts'][number];

export type ToolPart = Extract<ToolMessagePart, { type: 'dynamic-tool' }>;

export type ToolTextPart = Extract<ToolMessagePart, { type: 'text' }>;

export type ToolReasoningPart = Extract<ToolMessagePart, { type: 'reasoning' }>;

export type ToolBlock =
  | { kind: 'text'; index: number; parts: ToolTextPart[] }
  | { kind: 'reasoning'; index: number; parts: ToolReasoningPart[] }
  | { kind: 'tools'; index: number; parts: DynamicToolUIPart[] }
  | { kind: 'events'; index: number; events: ToolEvent[] }
  | { kind: 'failure'; index: number; text: string }
  | { kind: 'artifact'; index: number; artifact: UniversalTypes.ToolCallArtifact }
  | { kind: 'gif'; index: number; gif: UniversalTypes.GifToolDetails }
  | { kind: 'subagent'; index: number; part: DynamicToolUIPart; subagent: ToolSubagent };

export interface ToolInputTextParams {
  input: DynamicToolUIPart['input'];
  key: string;
}

export interface ToolInputText {
  key: string;
  value: string;
}

export type ToolBot = Pick<UniversalTypes.Bot, 'name'> & Partial<Pick<UniversalTypes.Bot, 'avatar'>>;

export type ToolIconKind = 'terminal' | 'file' | 'edit' | 'search' | 'bot' | 'model' | 'question' | 'secret' | 'routine' | 'todo' | 'artifact' | 'mcp' | 'tool';

export interface ToolPresentation {
  label: string;
  icon: ToolIconKind;
}

export interface ToolPresentationDefinition {
  label: () => string;
  icon: ToolIconKind;
}

export interface ToolIdentity {
  name: string;
  identifier: string;
  isMcp: boolean;
}

export interface ToolBlocksParams {
  parts: ChatMessage['parts'];
  hideVerbose?: boolean;
}

export interface ToolCollapsedParams {
  part: DynamicToolUIPart;
  grouped: boolean;
  expanded: boolean;
}

export interface ToolGroupStateParams {
  parts: DynamicToolUIPart[];
}

export interface ToolActivityLabel {
  plain: () => string;
  detail?: (detail: string) => string;
}
