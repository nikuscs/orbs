import type { RoomsReactionGroup } from './rooms.types';
import type * as ToolTypes from './tool.types';
import type * as UniversalTypes from '@repo/contracts/universal';
import type { UIMessage } from 'ai';

export type ChatApprovalDecision = 'approve' | 'always' | 'deny';

export type ChatActivity = 'idle' | 'queued' | 'thinking' | 'working' | 'writing' | 'compacting' | 'failed';

export interface ChatUsage {
  input: number;
  output: number;
  cacheRead: number;
  cost: { total: number };
}

export type ChatEntry = UniversalTypes.ConversationView['entries'][number];

export type ChatPiMessage = NonNullable<ChatEntry['model']>[number];

export interface ChatReplyTo {
  entryId: number;
  authorName: string;
  text: string;
}

export interface ChatMetadata {
  entryId: number;
  entryIds: number[];
  createdAt: number;
  authorId: string | null;
  authorName: string;
  replyTo: ChatReplyTo | null;
  usage: ChatUsage | null;
}

interface ChatDataPartPayloads {
  subagent: UniversalTypes.EntrySubagentReport;
  ownerNote: UniversalTypes.EntryOwnerNote & { peerName: string | null };
  routineRun: UniversalTypes.EntryRoutineRun;
  compaction: { status: 'done' };
  reset: Record<string, never>;
  failure: { text: string };
}

export type ChatDataParts = Pick<ChatDataPartPayloads, keyof ChatDataPartPayloads>;

export type ChatMessage = UIMessage<ChatMetadata, ChatDataParts>;

export type ChatPart = ChatMessage['parts'][number];

export interface ChatMessagesParams {
  entries: readonly ChatEntry[];
  bot: UniversalTypes.Bot;
  bots: UniversalTypes.Bot[];
}

export interface ChatLiveParams {
  state: UniversalTypes.ConversationState;
  bot: UniversalTypes.Bot;
  approvals: UniversalTypes.ToolApproval[];
}

export interface ChatQueued {
  submissionId: number;
  mode: 'steer' | 'followUp';
  text: string;
}

export interface ChatOutgoing {
  requestId: string;
  botId: string;
  text: string;
  afterEntryId: number;
  createdAt: number;
  submissionId?: number;
}

export interface ChatOutgoingParams {
  botId: string;
  latestEntryId: number;
  queued: ChatQueued[];
}

type ChatQueuedInput = Extract<UniversalTypes.ConversationState['inbox']['items'][number], { mode: 'steer' | 'followUp' }>;

export type ChatInputContent = ChatQueuedInput['content'] | Extract<ChatPiMessage, { role: 'user' | 'toolResult' }>['content'];

export type ChatContentPart = Extract<ChatPiMessage, { role: 'assistant' }>['content'][number];

export interface ChatOwnerContent {
  text: string;
  files: ChatPart[];
  replyTo: ChatReplyTo | null;
  createdAt: number;
}

export interface ChatHistoryParams {
  botId: string;
  conversationId: number;
  cursor: UniversalTypes.ConversationView['historyCursor'];
}

export interface ChatContextUsageParams {
  botId: string;
  conversationId: number;
  revision?: number;
}

export interface ChatContextView {
  percent: number | null;
  shown: string | null;
  used: string;
  label: string;
  tokens: string;
  tone: 'muted' | 'warning' | 'destructive';
}

export interface ChatReactionsParams {
  botId: string;
  conversationId: number;
  entryIds: number[];
  revision?: number;
}

export interface ChatReactParams {
  entryId: number;
  emoji: string;
  groups: RoomsReactionGroup[];
}

export interface ChatAnswerProblemParams {
  isGone: boolean;
  isError: boolean;
}

export interface ChatQueueParams extends Required<UniversalTypes.ConversationTarget> {
  onOutgoingChange: ChatSendParams['onOutgoingChange'];
}

export interface ChatSendParams {
  botId: string;
  conversationId: number;
  latestEntryId: number;
  onOutgoingChange: (change: (items: ChatOutgoing[]) => ChatOutgoing[]) => void;
  onResetDone: () => void;
}

export interface ChatSendInput {
  text: string;
  attachmentIds: string[];
  replyToEntryId?: number;
}

export type ChatSendResult = { kind: 'sent' } | { kind: 'command' } | { kind: 'reset'; handoff?: string };

export interface ChatResetCommand {
  handoff?: string;
}

export interface ChatSubagentParams {
  botId: string;
  part: ToolTypes.ToolPart;
  subagent: ToolTypes.ToolSubagent;
}

export interface ChatAroundParams {
  bot: UniversalTypes.Bot;
  bots: UniversalTypes.Bot[];
  view: UniversalTypes.ConversationView;
  entryId: number;
}

export interface ChatRoomParams {
  bot: UniversalTypes.Bot;
  bots: UniversalTypes.Bot[];
  view: UniversalTypes.ConversationView;
  outgoing: ChatOutgoing[];
  isMain?: boolean;
}

export interface ChatResetParams {
  botId: string;
  handoff?: string;
  onDone?: () => void;
}

export interface ChatMessageReactionParams {
  botId: string;
  conversationId: number;
  entryId: number;
}

export interface ChatFileTypeParams {
  name: string;
  mediaType?: string;
}

export interface ChatPicked {
  uri: string;
  name: string;
  mediaType: string;
  size: number;
}

export interface ChatAttachmentsPlatformParams {
  botId: string;
  onProblem: (message: string) => void;
}
