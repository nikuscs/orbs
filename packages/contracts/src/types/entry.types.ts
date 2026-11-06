import { z } from 'zod';

export const ENTRY = {
  user: 'pi.user',
  assistant: 'pi.assistant',
  toolResult: 'pi.tool-result',
  reset: 'pi.reset',
  compaction: 'pi.compaction',
  peerMessage: 'bots.bot-message',
  peerReply: 'bots.bot-reply',
  subagentReport: 'bots.subagent-report',
  ownerNote: 'bots.owner-note',
  routineRun: 'bots.routine-run',
  botStart: 'bots.bot-start',
} as const;

export const entryPeerMessage = z.object({
  fromBotId: z.uuid(),
  toBotId: z.uuid(),
  deliveryId: z.number().int().positive(),
  hops: z.number().int().positive().optional(),
});

export const entryPeerReply = entryPeerMessage.extend({
  result: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('answered'),
      answerId: z.number().int().positive(),
      text: z.string(),
    }),
    z.object({ status: z.literal('unanswered'), reason: z.string() }),
  ]),
});

export const entrySubagentReport = z.object({
  name: z.string(),
  conversationId: z.number().int().positive(),
  status: z.enum(['answered', 'failed']),
});

export const entryOwnerNote = z.object({
  peerBotId: z.uuid().nullable(),
  conversationId: z.number().int().positive(),
  hops: z.number().int().nonnegative(),
  text: z.string(),
});

export const entryRoutineRun = z.object({
  routineId: z.string(),
  name: z.string(),
});

export type EntryPeerMessage = z.infer<typeof entryPeerMessage>;
export type EntryPeerReply = z.infer<typeof entryPeerReply>;
export type EntrySubagentReport = z.infer<typeof entrySubagentReport>;
export type EntryOwnerNote = z.infer<typeof entryOwnerNote>;
export type EntryRoutineRun = z.infer<typeof entryRoutineRun>;
