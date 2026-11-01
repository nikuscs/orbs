import type * as ClientTypes from '@repo/client/client';
import type { ToolCallArtifact } from '@repo/contracts/universal';

type ChatSearchParams = Record<string, string | string[] | undefined>;

export interface ChatRouteParams extends ChatSearchParams {
  botId: string;
  replyToEntryId?: string;
  quote?: string;
  quoteEntryId?: string;
  prefill?: string;
  entryId?: string;
}

export interface ChatSubagentRouteParams extends ChatSearchParams {
  botId: string;
  conversationId: string;
  name: string;
  task: string;
}

export interface ChatPairRouteParams extends ChatSearchParams {
  botId: string;
  peerId: string;
  conversationId: string;
}

export interface ChatReactionRouteParams extends ChatSearchParams {
  botId: string;
  conversationId: string;
  entryId: string;
}

export interface ChatActionsRouteParams extends ChatReactionRouteParams {
  from: 'user' | 'assistant';
  text: string;
  details?: string;
}

export interface ChatContextRouteParams extends ChatSearchParams {
  botId: string;
  conversationId: string;
}

export interface ChatResetRouteParams extends ChatSearchParams {
  botId: string;
  handoff?: string;
}

export interface ChatHtmlRouteParams extends ChatSearchParams {
  botId: string;
  html: string;
}

export interface ChatTextRouteParams extends ChatSearchParams {
  botId: string;
  entryId: string;
  text: string;
}

export type ChatMessagePart =
  | { key: string; kind: 'markdown' | 'html'; text: string; isStreaming: boolean }
  | { key: string; kind: 'artifact'; artifact: ToolCallArtifact }
  | { key: string; kind: 'files'; files: ClientTypes.RoomsFilePart[] };

export type ChatMessageSegment =
  | { key: string; kind: 'bubbles'; parts: ChatMessagePart[] }
  | { key: string; kind: 'tools'; parts: ClientTypes.ToolPart[] }
  | { key: string; kind: 'events'; events: ClientTypes.ToolEvent[] }
  | { key: string; kind: 'reasoning'; text: string; isStreaming: boolean }
  | { key: string; kind: 'failure'; text: string }
  | { key: string; kind: 'subagent'; part: ClientTypes.ToolPart; subagent: ClientTypes.ToolSubagent };

export interface ChatPlayback {
  pause: () => void;
}

export interface ChatMediaRouteParams extends ChatSearchParams {
  botId: string;
  attachmentId: string;
  entryId?: string;
}
