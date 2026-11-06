import { defineTask } from '@earendil-works/pi-durable';
import { match, P } from 'ts-pattern';
import { collaborationActionDeliver } from './collaboration-action.deliver';
import { COLLABORATION } from './collaboration.constants';
import { collaborationFailureNote } from './collaboration.utils';
import type * as CollaborationTypes from '../../types/collaboration.types';

export function collaborationDeliveryTask({ directory }: Pick<CollaborationTypes.CollaborationDeps, 'directory'>) {
  return defineTask<CollaborationTypes.CollaborationDeliveryInput, CollaborationTypes.CollaborationDeliveryState, CollaborationTypes.CollaborationResult>({
    name: COLLABORATION.delivery,
    version: 1,
    initial: () => ({ phase: 'deliver' }),
    phases: {
      deliver: async (task, api, context) => {
        const input = task.input;
        const store = await directory.harness(input.recipientId).catch(() => null);

        const result = await match(store)
          .with(P.nonNullable, (harness) => collaborationActionDeliver({ harness }, {
            taskId: task.id,
            input,
            context,
          }))
          .otherwise(() => ({ status: 'unanswered' as const, reason: 'Recipient bot is unavailable.' }));

        await api.commit(() => match(input.mode)
          .with('ask', () => ({ status: 'terminal' as const, outcome: { status: 'completed' as const, result } }))
          .with('send', () => {
            const report = match(result)
              .with({ status: 'answered' }, ({ text }) => `[${input.recipientName} replied privately and tells the owner about its own work itself. Do not repeat its details to the user; mention only what changes for your own work, briefly, if anything. Do not message ${input.recipientName} again about this.]\n\n${text}`)
              .with({ status: 'unanswered', reason: 'aborted' }, () => null)
              .with({ status: 'unanswered' }, ({ reason }) => collaborationFailureNote(input.recipientName, reason))
              .exhaustive();

            return { status: 'running' as const, checkpoint: { phase: 'report' as const, result, report } };
          })
          .exhaustive(), context);
      },
      report: async (task, api, context) => {
        const { result, report: text } = task.state.checkpoint;

        await match(text)
          .with(P.string, async (answer) => {
            const sender = await api.conversation(api.conversationId, context);
            await sender?.submit({
              type: 'input',
              content: answer,
              whenBusy: 'followUp',
              requestId: `bots.reply:${task.input.requestId}`,
              entry: { kind: COLLABORATION.reply,
                data: {
                  fromBotId: task.input.recipientId,
                  toBotId: task.input.senderId,
                  deliveryId: task.id,
                  hops: task.input.hops,
                  result,
                } },
            }, context);
          })
          .otherwise(() => undefined);

        await api.commit(() => ({ status: 'terminal', outcome: { status: 'completed', result } }), context);
      },
    },
    abort: (_task, api, context) => api.commit(() => ({ status: 'terminal', outcome: { status: 'aborted' } }), context),
  });
}
