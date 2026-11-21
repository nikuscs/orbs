import { conversationIndex } from './conversation-index.constants';
import { conversationIndexSummaries } from './conversation-index.utils';
import type { ConversationIndexServiceDeps } from '../../types/conversation-index.types';
import type { Context } from '@earendil-works/chord/context';

export async function conversationIndexQueryList({ harness, notifications }: ConversationIndexServiceDeps, context: Context) {
  const index = await harness.snapshot(conversationIndex, context);
  const graph = await harness.taskGraph(context);

  try {
    const pending = await notifications.queries.pending(graph.value, context);
    return conversationIndexSummaries(index, graph.value, pending);
  } finally {
    graph.dispose();
  }
}
