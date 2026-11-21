import type { NotificationService } from '../services/notification/notification.service';
import type { MutableReplicatedState } from '@earendil-works/chord';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';
import type { ConversationSummary } from '@repo/contracts/universal';

export type ConversationIndexItem = Pick<ConversationSummary, 'botId' | 'conversationId' | 'lastMessage'> & {
  lastAssistantEntryId: number;
};

export type ConversationIndexSummary = ConversationIndexItem & { isRunning: boolean; isWorking: boolean; isWaiting: boolean };

export interface ConversationIndexPreview {
  lastMessage: ConversationSummary['lastMessage'];
  lastAssistantEntryId: number;
}

export interface ConversationIndexDocument extends PiDurableTypes.JsonObject {
  conversations: Record<string, ConversationIndexItem | null>;
}

export interface ConversationIndexServiceDeps {
  harness: PiDurableTypes.Harness;
  notifications: NotificationService;
}

export interface ConversationIndexRestoreParams {
  botId: string;
  conversationId: PiDurableTypes.ConversationId;
}

export interface ConversationIndexDeps extends ConversationIndexServiceDeps {
  conversations: Set<PiDurableTypes.ConversationId>;
}

export interface ConversationIndexUpdate {
  conversationId: PiDurableTypes.ConversationId;
  lastMessage: NonNullable<ConversationSummary['lastMessage']>;
}

export interface ConversationIndexContextParams {
  context: Context;
}

export interface ConversationIndexUpdateParams extends ConversationIndexContextParams {
  messages: ConversationIndexUpdate[];
}

export interface ConversationIndexView {
  conversations: ConversationIndexSummary[];
}

export interface ConversationIndexWatch {
  state: MutableReplicatedState<ConversationIndexView>;
  closed: Promise<PiDurableTypes.WatchEnd>;
  stop(): Promise<PiDurableTypes.WatchEnd>;
}

export interface ConversationIndexService {
  watch(context: Context): Promise<ConversationIndexWatch>;
  actions: {
    restore(params: ConversationIndexRestoreParams, context: Context): Promise<void>;
  };
  queries: {
    list(context: Context): Promise<ConversationIndexSummary[]>;
  };
}
