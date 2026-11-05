import { defineDoc, defineDocFamily } from '@earendil-works/pi-durable';
import { ATTACHMENT, ENTRY, REPLY } from '@repo/contracts/universal';
import type * as CollaborationTypes from '../../types/collaboration.types';

export const collaborationCall = defineDoc({
  kind: 'bots.bot-delivery-call',
  version: 1,
  scope: 'task',
  initial: (): CollaborationTypes.CollaborationCall => ({ deliveryId: null }),
  checkpointWhen: () => false,
});

export const collaborationStore = defineDoc<CollaborationTypes.CollaborationStore>({
  kind: 'bots.bot-store',
  version: 1,
  scope: 'session',
  initial: () => ({ storeId: null }),
  checkpointWhen: () => false,
});

export const collaborationPrivateBinding = defineDocFamily<CollaborationTypes.CollaborationPrivateBinding, null>({
  kind: 'bots.bot-temporary-binding',
  version: 1,
  scope: 'session',
  family: true,
  initial: () => ({ conversationId: null }),
  checkpointWhen: () => false,
});

export const collaborationPrivateLinks = defineDoc<CollaborationTypes.CollaborationPrivateLinks>({
  kind: 'bots.bot-temporary-links',
  version: 1,
  scope: 'conversation',
  history: 'latest',
  fork: 'initial',
  initial: () => ({ links: [] }),
  checkpointWhen: () => false,
});

export const collaborationPrivateContext = defineDoc<CollaborationTypes.CollaborationPrivateContext>({
  kind: 'bots.bot-temporary-context',
  version: 1,
  scope: 'conversation',
  history: 'latest',
  fork: 'initial',
  initial: () => ({
    senderId: null,
    recipientId: null,
    createdAt: null,
  }),
  checkpointWhen: () => false,
});

export const COLLABORATION = {
  extension: 'bots.collaboration',
  delivery: 'bots.bot-delivery',
  message: ENTRY.peerMessage,
  reply: ENTRY.peerReply,
  note: ENTRY.ownerNote,
  turnInputs: new Set<string>(['pi.user', ENTRY.routineRun, REPLY.entryKind, ATTACHMENT.entryKind, ENTRY.peerMessage, ENTRY.peerReply, ENTRY.ownerNote]),
} as const;
