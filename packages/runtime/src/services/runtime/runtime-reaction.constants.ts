import { defineDocFamily, UserEntry } from '@earendil-works/pi-durable';
import { ATTACHMENT, REACTION, REPLY } from '@repo/contracts/universal';
import { match, P } from 'ts-pattern';
import type { RuntimeReaction } from '../../types/runtime-reaction.types';

export const RUNTIME_REACTION_TASK = 'bots.reaction';

export const RUNTIME_REACTION_OWNER_KINDS = new Set<string>([UserEntry.kind, ATTACHMENT.entryKind, REPLY.entryKind]);

export const runtimeReactions = defineDocFamily<RuntimeReaction, null>({
  kind: REACTION.docKind,
  version: 2,
  scope: 'conversation',
  family: true,
  history: 'latest',
  fork: 'initial',
  initial: () => ({ emojis: [], botReactions: [] }),
  migrate: (value, fromVersion) => ({
    emojis: match(value)
      .with({ emojis: P.array(P.string) }, ({ emojis }) => [...emojis])
      .otherwise(() => []),
    botReactions: match({ value, fromVersion })
      .with({ fromVersion: 1 }, () => [])
      .with({ value: { botReactions: P.array({ botId: P.string, emojis: P.array(P.string) }) } }, ({ value: { botReactions } }) => (
        botReactions.map((reaction) => ({ botId: reaction.botId, emojis: [...reaction.emojis] }))
      ))
      .otherwise(() => []),
  }),
  checkpointWhen: () => false,
});
