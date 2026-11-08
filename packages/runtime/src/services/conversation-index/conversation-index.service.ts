import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import { conversationIndexActionRestore } from './conversation-index-action.restore';
import { conversationIndexActionUpdate } from './conversation-index-action.update';
import { conversationIndexQueryList } from './conversation-index-query.list';
import { conversationIndexQueryWatch } from './conversation-index-query.watch';
import { conversationIndex } from './conversation-index.constants';
import { conversationIndexMessage } from './conversation-index.utils';
import type * as ConversationIndexTypes from '../../types/conversation-index.types';

export async function makeConversationIndexService(
  { harness, notifications }: ConversationIndexTypes.ConversationIndexServiceDeps,
): Promise<ConversationIndexTypes.ConversationIndexService> {
  const deps: ConversationIndexTypes.ConversationIndexDeps = { harness, notifications, conversations: new Set() };
  await harness.commit(async (tx) => {
    await tx.doc(conversationIndex);
  }, BACKGROUND_CONTEXT);
  let isClosed = false;
  let pending = Promise.resolve();
  let unapplied: ConversationIndexTypes.ConversationIndexUpdate[] = [];

  const unsubscribe = harness.subscribeCommits((publication) => {
    const messages = publication.changes
      .filter((change) => change.type === 'entry')
      .filter(({ value }) => deps.conversations.has(value.conversationId))
      .flatMap(({ value }) => match(conversationIndexMessage(value))
        .with(P.nonNullable, (lastMessage) => [{ conversationId: value.conversationId, lastMessage }])
        .otherwise(() => []));

    match(messages.length > 0)
      .with(true, () => queueMicrotask(() => match(isClosed)
        .with(true, () => undefined)
        .with(false, () => {
          const batch = [...unapplied, ...messages];
          unapplied = [];
          pending = conversationIndexActionUpdate(deps, { messages: batch, context: BACKGROUND_CONTEXT }).catch((error: unknown) => {
            unapplied = [...batch, ...unapplied];
            log.error({
              tag: 'conversation-index',
              message: 'Cannot update conversation index; retrying with the next commit.',
              error,
            });
          });
        })
        .exhaustive()))
      .with(false, () => undefined)
      .exhaustive();
  });

  harness.subscribeClose(() => {
    isClosed = true;
    unsubscribe();
  });

  return {
    watch: async (context) => {
      await pending;
      return conversationIndexQueryWatch(deps, context);
    },
    actions: {
      restore: (params, context) => conversationIndexActionRestore(deps, { ...params, context }),
    },
    queries: {
      list: async (context) => {
        await pending;
        return conversationIndexQueryList(deps, context);
      },
    },
  };
}
