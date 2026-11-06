import { AssistantEntry } from '@earendil-works/pi-durable';
import { replySilent } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { runtimeBot } from '../runtime/runtime.constants';
import type { CollaborationDeliveryInput } from '../../types/collaboration.types';
import type { Context } from '@earendil-works/chord/context';
import type { EntryId, ToolExecutionApi, Tx } from '@earendil-works/pi-durable';

export async function collaborationBotId(api: ToolExecutionApi, context: Context) {
  const identity = await api.snapshot(runtimeBot, api.conversationId, context);

  return match(identity?.botId)
    .with(P.string, (id) => id)
    .otherwise(() => {
      throw new Errors.FORBIDDEN();
    });
}

export async function collaborationAnswer(tx: Tx, answerId: EntryId) {
  const entry = await tx.entry(AssistantEntry, answerId);

  return (entry?.model ?? []).flatMap((message) => match(message)
    .with({ role: 'assistant' }, ({ content }) => content.flatMap((part) => match(part)
      .with({ type: 'text' }, ({ text }) => (replySilent.safeParse(text).success ? [] : [text]))
      .otherwise(() => [])))
    .otherwise(() => [])).join('\n');
}

export function collaborationFailureNote(recipientName: string, reason: string) {
  return `[Your message to ${recipientName} failed: ${reason}] Tell the user in one short sentence that you could not reach ${recipientName} and will try again, then send it once more. If it already failed twice, tell the user and stop.`;
}

export function collaborationPeerNote({ senderName, hops, maxHops }: Pick<CollaborationDeliveryInput, 'senderName' | 'hops' | 'maxHops'>) {
  const left = maxHops - hops;
  const redirect = `If another bot owns this, do not relay it: reply with that bot's name and [@handle](bot:<bot ID>) link from bot_list so ${senderName} contacts it directly.`;

  return match(left > 0)
    .with(true, () => `[Private message from ${senderName}. Answer this request yourself when you can. ${redirect} Forward only when you must combine the other bot's answer with your own work; use bot_ask, because a later bot_message reply cannot reach ${senderName}. ${left} more ${left === 1 ? 'hop is' : 'hops are'} left.]`)
    .with(false, () => `[Private message from ${senderName}. Answer this request; it cannot be forwarded to another bot. ${redirect}]`)
    .exhaustive();
}

export function collaborationOwnerNote(peerName: string | null) {
  const source = peerName ? `your private chat with ${peerName}` : 'a private chat with another bot';

  return `[You raised this from ${source}, which the owner cannot see. Tell the owner about it now, in your own words. Do not answer the other bot from here.]`;
}
