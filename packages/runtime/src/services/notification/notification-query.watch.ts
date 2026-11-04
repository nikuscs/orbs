import { replicatedState } from '@earendil-works/chord';
import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import {
  notificationCommitAttention,
  notificationCommitIsRelevant,
  notificationPendingItems,
  notificationRecentAppend,
  notificationReplyIsForOwner,
  notificationToolTaskIds,
} from './notification.utils';
import type * as NotificationTypes from '../../types/notification.types';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export async function notificationQueryWatch(deps: NotificationTypes.NotificationServiceDeps, context: Context) {
  const { harness, botId } = deps;
  const queued: NotificationTypes.NotificationQueuedCommit[] = [];
  let tasks: PiDurableTypes.TaskGraph;
  let toolIds = '';
  let isAttached = false;
  let isStopped = false;
  let failure: Error | undefined;
  let work = Promise.resolve();
  let stopping: Promise<PiDurableTypes.WatchEnd> | undefined;
  const state = replicatedState<NotificationTypes.NotificationState>({ pending: [], recent: [] });

  const unsubscribe = harness.subscribeCommits((publication, commitContext) => {
    match(notificationCommitIsRelevant(publication.changes))
      .with(true, () => {
        queued.push({ publication, commitContext });
        match(isAttached)
          .with(true, () => notificationEnqueue(() => notificationApplyQueued()))
          .with(false, () => undefined)
          .exhaustive();
      })
      .with(false, () => undefined)
      .exhaustive();
  });

  const notificationEnqueue = (task: NotificationTypes.NotificationTask) => {
    work = work
      .then(() => match(isStopped)
        .with(true, () => undefined)
        .with(false, () => task())
        .exhaustive())
      .catch(async (error: unknown) => {
        failure = match(error)
          .with(P.instanceOf(Error), (value) => value)
          .otherwise((value) => new Errors.INTERNAL_ERROR({ cause: value }));
        await notificationStop();
      });
  };

  const notificationPublishPending = async (commitContext: Context) => {
    const pending = await notificationPendingItems(deps, tasks, context);
    match(isStopped)
      .with(true, () => undefined)
      .with(false, () => {
        state.change(commitContext, (draft) => {
          draft.pending = pending;
        });
      })
      .exhaustive();
  };

  const notificationApplyQueued = async () => {
    const batch = queued.splice(0);

    await match({ isStopped, empty: batch.length === 0 })
      .with({ isStopped: true }, () => undefined)
      .with({ empty: true }, () => undefined)
      .otherwise(async () => {
        const attention = notificationCommitAttention(batch.flatMap(({ publication }) => publication.changes));

        const ownerFlags = await Promise.all(attention.replies.map((entry) => notificationReplyIsForOwner(deps, entry, context)));
        const replies = attention.replies.filter((_entry, index) => ownerFlags[index]);

        const items: NotificationTypes.NotificationItem[] = [
          ...replies.map((entry) => ({ kind: 'reply' as const, botId, conversationId: entry.conversationId, entryId: entry.id })),
          ...attention.failures.map((task) => ({ kind: 'failure' as const, botId, conversationId: task.conversationId, taskId: task.id })),
        ];

        match(items)
          .with([], () => undefined)
          .otherwise((value) => {
            state.change(batch.at(-1)?.commitContext ?? context, (draft) => {
              for (const item of value) {
                draft.recent = notificationRecentAppend(draft.recent, item);
              }
            });
          });

        await match(attention.shouldRebuild)
          .with(true, () => notificationPublishPending(batch.at(-1)?.commitContext ?? context))
          .with(false, () => undefined)
          .exhaustive();
      });
  };

  let notificationStop = async (): Promise<PiDurableTypes.WatchEnd> => {
    isStopped = true;
    unsubscribe();

    return { reason: 'stopped' };
  };

  try {
    const graph = await harness.watchTaskGraph(context);

    notificationStop = async () => {
      isStopped = true;
      unsubscribe();
      stopping ??= graph.stop();

      return stopping;
    };

    try {
      tasks = graph.value;
      toolIds = notificationToolTaskIds(tasks);
      await notificationPublishPending(context);
      isAttached = true;
      notificationEnqueue(() => notificationApplyQueued());

      graph.start(async (value, _ops, commitContext) => {
        tasks = value;
        const next = notificationToolTaskIds(tasks);
        match(next === toolIds)
          .with(true, () => undefined)
          .with(false, () => {
            toolIds = next;
            notificationEnqueue(() => notificationPublishPending(commitContext));
          })
          .exhaustive();
      });

      const closed = graph.closed.then(async (end) => {
        await notificationStop();
        return match(failure)
          .with(P.nonNullable, (error) => ({ reason: 'listener_error' as const, error }))
          .otherwise(() => end);
      });

      return { state, closed, stop: notificationStop };
    } catch (error) {
      await notificationStop();
      throw error;
    }
  } catch (error) {
    unsubscribe();
    throw error;
  }
}
