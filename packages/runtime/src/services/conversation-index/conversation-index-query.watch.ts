import { replicatedState } from '@earendil-works/chord';
import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { conversationIndex } from './conversation-index.constants';
import { conversationIndexSummaries } from './conversation-index.utils';
import type { ConversationIndexServiceDeps } from '../../types/conversation-index.types';
import type { Context } from '@earendil-works/chord/context';

export async function conversationIndexQueryWatch({ harness, notifications }: ConversationIndexServiceDeps, context: Context) {
  const index = match(await harness.watchDoc(conversationIndex, context))
    .with(P.nonNullable, (watch) => watch)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: 'Conversation index is missing.' });
    });

  try {
    const graph = await harness.watchTaskGraph(context);

    try {
      const waiting = await notifications.watch(context);
      let summaries = index.value;
      let tasks = graph.value;
      let pending = waiting.state.value.pending;
      const state = replicatedState({ conversations: conversationIndexSummaries(summaries, tasks, pending) });

      const conversationIndexPublish = (commitContext: Context) => {
        state.change(commitContext, (draft) => {
          draft.conversations = conversationIndexSummaries(summaries, tasks, pending);
        });
      };

      index.start(async (value, _ops, commitContext) => {
        summaries = value;
        conversationIndexPublish(commitContext);
      });
      graph.start(async (value, _ops, commitContext) => {
        tasks = value;
        conversationIndexPublish(commitContext);
      });

      const unwatch = waiting.state.subscribe((value, commitContext) => {
        pending = value.pending;
        conversationIndexPublish(commitContext);
      });

      const conversationIndexStop = async () => {
        unwatch();

        const [end] = await Promise.all([
          index.stop(),
          graph.stop(),
          waiting.stop(),
        ]);

        return end;
      };

      const closed = Promise.race([index.closed, graph.closed, waiting.closed]).then(async (end) => {
        await conversationIndexStop();
        return end;
      });

      return { state, closed, stop: conversationIndexStop };
    } catch (error) {
      await graph.stop();
      throw error;
    }
  } catch (error) {
    await index.stop();
    throw error;
  }
}
