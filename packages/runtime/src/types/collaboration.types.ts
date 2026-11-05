import { z } from 'zod';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export const collaborationDeliveryTarget = z.object({
  recipientConversationId: z.number(),
  recipientName: z.string(),
});

export interface CollaborationBot {
  id: string;
  name: string;
  handle: string;
}

export interface CollaborationListedBot extends CollaborationBot {
  summary: string;
}

export interface CollaborationBotParams {
  botId: string;
}

export interface CollaborationRecipientParams extends CollaborationBotParams {
  recipientId: string;
  hops: number;
}

export interface CollaborationPolicy {
  queries: {
    bots(params: CollaborationBotParams): Promise<CollaborationListedBot[]>;
    recipient(params: CollaborationRecipientParams): Promise<{
      sender: CollaborationBot;
      recipient: CollaborationBot;
      maxPending: number;
      maxHops: number;
    }>;
  };
}

export interface CollaborationDirectory {
  harness(botId: string): Promise<PiDurableTypes.Harness>;
}

export interface CollaborationDeps {
  policy: CollaborationPolicy;
  directory: CollaborationDirectory;
}

export interface CollaborationDeliveryInput extends PiDurableTypes.JsonObject {
  requestId: string;
  hops: number;
  maxHops: number;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientConversationId: PiDurableTypes.ConversationId;
  message: string;
  mode: 'ask' | 'send';
}

export type CollaborationResult =
  | { status: 'answered'; answerId: PiDurableTypes.EntryId; text: string }
  | { status: 'unanswered'; reason: string };

export type CollaborationDeliveryState =
  | { phase: 'deliver' }
  | { phase: 'report'; result: CollaborationResult; report: string | null };

export interface CollaborationToolDeps extends CollaborationDeps {
  delivery: PiDurableTypes.Task<CollaborationDeliveryInput, CollaborationDeliveryState, CollaborationResult, object>;
}

export interface CollaborationSendParams {
  botId: string;
  message: string;
  mode: 'ask' | 'send';
  context?: 'existing' | 'private';
}

export interface CollaborationContextParams {
  context: Context;
}

export interface CollaborationSendCall extends CollaborationContextParams {
  input: CollaborationSendParams;
  api: PiDurableTypes.ToolExecutionApi;
}

export interface CollaborationNotifyCall extends CollaborationContextParams {
  input: { message: string };
  api: PiDurableTypes.ToolExecutionApi;
}

export interface CollaborationHarnessDeps {
  harness: PiDurableTypes.Harness;
}

export interface CollaborationTargetParams extends CollaborationContextParams {
  senderId: string;
  senderStoreId: string;
  recipientId: string;
  target: 'existing' | 'private';
}

export interface CollaborationDeliverParams extends CollaborationContextParams {
  taskId: number;
  input: CollaborationDeliveryInput;
}

export interface CollaborationPrivateBinding extends PiDurableTypes.JsonObject {
  conversationId: PiDurableTypes.ConversationId | null;
}

export interface CollaborationPrivateContext extends PiDurableTypes.JsonObject {
  senderId: string | null;
  recipientId: string | null;
  createdAt: number | null;
}

export interface CollaborationPrivateLinks extends PiDurableTypes.JsonObject {
  links: { recipientId: string; conversationId: PiDurableTypes.ConversationId; createdAt: number }[];
}

export interface CollaborationStore extends PiDurableTypes.JsonObject {
  storeId: string | null;
}

export interface CollaborationCall extends PiDurableTypes.JsonObject {
  deliveryId: PiDurableTypes.TaskId<CollaborationResult> | null;
}
