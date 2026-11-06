import { AssistantEntry, UserEntry } from '@earendil-works/pi-durable';
import { ATTACHMENT, REACTION, REPLY } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { RUNTIME_REACTION_OWNER_KINDS, runtimeReactions } from './runtime-reaction.constants';
import { runtimeBot } from './runtime.constants';
import type { RuntimeReaction, RuntimeReactionToolInput } from '../../types/runtime-reaction.types';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';
import type { ConversationReaction } from '@repo/contracts/universal';

export function runtimeReactionTarget(entry: PiDurableTypes.EntryRecord | undefined, conversationId: PiDurableTypes.ConversationId) {
  return match(entry)
    .with({
      conversationId,
      kind: P.union(UserEntry.kind, ATTACHMENT.entryKind, REPLY.entryKind, 'bots.bot-message', 'bots.bot-reply'),
    }, (value) => value)
    .with({ conversationId, kind: AssistantEntry.kind }, (value) => match(value.model?.[0])
      .with({ role: 'assistant' }, (message) => (
        message.content.some((part) => part.type === 'text' && part.text.trim() !== '') ? value : undefined
      ))
      .otherwise(() => undefined))
    .otherwise(() => undefined);
}

export function runtimeReactionView(entryId: number, document: RuntimeReaction): ConversationReaction {
  return {
    entryId,
    emojis: [...document.emojis],
    botReactions: document.botReactions.flatMap((item) => match(item.emojis.length)
      .with(0, () => [])
      .otherwise(() => [{ botId: item.botId, emojis: [...item.emojis] }])),
  };
}

export function runtimeReactionToggle(emojis: string[], emoji: string, isPresent: boolean) {
  const hasEmoji = emojis.includes(emoji);

  match({ isPresent, hasEmoji })
    .with({ isPresent: true, hasEmoji: true }, { isPresent: false, hasEmoji: false }, () => undefined)
    .with({ isPresent: true, hasEmoji: false }, () => {
      match(emojis.length < REACTION.maxPerEntry)
        .with(false, () => {
          throw new Errors.VALIDATION_ERROR({
            fields: { emoji: { message: 'validation_reaction_limit', args: { max: REACTION.maxPerEntry } } },
          });
        })
        .with(true, () => {
          emojis.push(emoji);
        })
        .exhaustive();
    })
    .with({ isPresent: false, hasEmoji: true }, () => {
      emojis.splice(emojis.indexOf(emoji), 1);
    })
    .exhaustive();
}

function runtimeReactionApplyBot(document: RuntimeReaction, botId: string, params: RuntimeReactionToolInput) {
  const existing = document.botReactions.find((item) => item.botId === botId);

  match(existing)
    .with(P.nonNullable, (item) => {
      runtimeReactionToggle(item.emojis, params.emoji, params.isPresent);
    })
    .otherwise(() => {
      match(params.isPresent)
        .with(true, () => {
          const emojis: string[] = [];
          runtimeReactionToggle(emojis, params.emoji, true);
          document.botReactions.push({ botId, emojis });
        })
        .with(false, () => undefined)
        .exhaustive();
    });

  document.botReactions = document.botReactions.filter((item) => item.emojis.length > 0);
}

export async function runtimeReactionSetBot(
  api: PiDurableTypes.ToolExecutionApi,
  params: RuntimeReactionToolInput,
  context: Context,
): Promise<ConversationReaction> {
  const identity = await api.snapshot(runtimeBot, api.conversationId, context);

  const botId = match(identity?.botId)
    .with(P.string, (id) => id)
    .otherwise(() => {
      throw new Errors.FORBIDDEN();
    });

  return api.commit(async (tx) => {
    const entryId = params.entryId ?? (await tx.scanEntries({ conversationId: api.conversationId, order: 'descending' }, 50)).items
      .find((entry) => RUNTIME_REACTION_OWNER_KINDS.has(entry.kind))?.id;

    // SAFETY: an entry ID is only a lookup key; runtimeReactionTarget rejects entries outside this conversation.
    return match(runtimeReactionTarget(entryId === undefined ? undefined : await tx.entry(entryId as PiDurableTypes.EntryId), api.conversationId))
      .with(P.nullish, () => {
        throw new Errors.NOT_FOUND({ resource: 'entry', resourceId: entryId ?? 0 });
      })
      .otherwise(async (entry) => {
        const document = await tx.doc(runtimeReactions, api.conversationId, String(entry.id), null);
        runtimeReactionApplyBot(document, botId, params);

        return runtimeReactionView(entry.id, document);
      });
  }, context);
}
