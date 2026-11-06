import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { collaborationDeliveryTarget } from '../../types/collaboration.types';
import { collaborationActionTarget } from './collaboration-action.target';
import { collaborationQueryOrigin } from './collaboration-query.origin';
import { COLLABORATION, collaborationCall, collaborationPrivateLinks, collaborationStore } from './collaboration.constants';
import { collaborationFailureNote } from './collaboration.utils';
import type { CollaborationSendCall, CollaborationToolDeps } from '../../types/collaboration.types';

export async function collaborationActionSend(deps: CollaborationToolDeps, { input: params, api, context }: CollaborationSendCall) {
  const saved = await api.snapshot(collaborationCall, api.taskId, context);

  const deliveryId = await match(saved?.deliveryId)
    .with(P.nonNullable, (id) => id)
    .otherwise(async () => {
      const origin = await collaborationQueryOrigin(api, context);
      const target = params.context ?? 'private';
      const { sender, recipient, maxPending, maxHops } = await deps.policy.queries.recipient({ ...origin, recipientId: params.botId });

      const senderStoreId = await api.commit(async (tx) => {
        const store = await tx.doc(collaborationStore);
        store.storeId ??= crypto.randomUUID();

        return store.storeId;
      }, context);

      const recipientConversationId = await collaborationActionTarget({ harness: await deps.directory.harness(recipient.id) }, {
        senderId: sender.id,
        senderStoreId,
        recipientId: recipient.id,
        target,
        context,
      });

      return api.commit(async (tx) => {
        const pages = await Promise.all((['pending', 'running', 'waiting', 'sleeping', 'completing'] as const).map((status) => tx.scanTasks({
          conversationId: api.conversationId,
          kind: COLLABORATION.delivery,
          status,
        }, maxPending)));

        const call = await tx.doc(collaborationCall, api.taskId);

        return match(call.deliveryId)
          .with(P.nonNullable, (id) => id)
          .otherwise(async () => {
            match(pages.flatMap((page) => page.items).length >= maxPending)
              .with(true, () => {
                throw new Errors.CONFLICT({ internal: 'Too many pending bot deliveries.' });
              })
              .with(false, () => undefined)
              .exhaustive();

            const ownership = match(params.mode)
              .with('ask', () => ({ ownership: { kind: 'task' as const, taskId: api.taskId } }))
              .with('send', () => ({ ownership: { kind: 'conversation' as const }, conversationId: api.conversationId, background: true }))
              .exhaustive();

            await match(target)
              .with('private', async () => {
                const privateLinks = await tx.doc(collaborationPrivateLinks, api.conversationId);

                match(privateLinks.links.some((link) => link.recipientId === recipient.id && link.conversationId === recipientConversationId))
                  .with(true, () => undefined)
                  .with(false, () => {
                    privateLinks.links.push({
                      recipientId: recipient.id,
                      conversationId: recipientConversationId,
                      createdAt: Date.now(),
                    });
                  })
                  .exhaustive();
              })
              .with('existing', () => undefined)
              .exhaustive();

            call.deliveryId = await tx.createTask(deps.delivery, {
              requestId: `${senderStoreId}:${api.taskId}`,
              hops: origin.hops + 1,
              maxHops,
              senderId: sender.id,
              senderName: sender.name,
              recipientId: recipient.id,
              recipientName: recipient.name,
              recipientConversationId,
              message: params.message,
              mode: params.mode,
            }, ownership);

            return call.deliveryId;
          });
      }, context);
    });

  const delivery = await api.getTask(deliveryId, context);

  const { recipientConversationId, recipientName } = match(collaborationDeliveryTarget.safeParse(delivery?.input))
    .with({ success: true }, ({ data }) => data)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: 'Bot delivery target is unavailable.' });
    });

  const details = { deliveryId, recipientId: params.botId, recipientConversationId };
  await api.details(details, context);

  return match(params.mode)
    .with('send', () => ({ output: [{ type: 'text' as const, text: 'Message accepted. The reply will arrive in this conversation.' }] }))
    .with('ask', async () => {
      const { outcome } = (await api.waitForTask(deliveryId, context)).state;

      return match(outcome)
        .with({ status: 'completed', result: { status: 'answered' } }, ({ result }) => ({
          output: [{ type: 'text' as const, text: result.text }],
          details: { ...details, answerId: result.answerId },
        }))
        .with({ status: 'completed', result: { status: 'unanswered' } }, ({ result }) => ({
          isError: true,
          output: [{ type: 'text' as const, text: collaborationFailureNote(recipientName, result.reason) }],
        }))
        .otherwise(() => ({ isError: true, output: [{ type: 'text' as const, text: 'Bot delivery did not complete.' }] }));
    })
    .exhaustive();
}
