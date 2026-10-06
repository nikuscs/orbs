import { errorSchemas } from '@orbs/errors/universal';
import { ORPCError } from '@orpc/client';
import { RUN, runPassText } from '@orbs/server/client';
import type { RoomsBlindBotsParams, RoomsDraftWithoutPassParams } from '@/types/rooms.types';
import type { RoomUIMessage, TenantRoomSummary } from '@orbs/server/client';

export function roomsLeaderFirst(room: Pick<TenantRoomSummary, 'botIds' | 'leaderBotId'>): string[] {
  const leader = room.botIds.filter((botId) => botId === room.leaderBotId);

  return [...leader, ...room.botIds.filter((botId) => botId !== room.leaderBotId)];
}

export function roomsMessageText(message: RoomUIMessage): string {
  return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n');
}

export function roomsDraftWithoutPass({ draft }: RoomsDraftWithoutPassParams): RoomUIMessage | undefined {
  return draft && { ...draft, parts: draft.parts.filter((part) => part.type !== 'text' || !RUN.pass.startsWith(runPassText(part.text))) };
}

export function roomsBlindBots({ error }: RoomsBlindBotsParams): string | undefined {
  if (!(error instanceof ORPCError) || error.code !== 'VALIDATION_ERROR') {
    return undefined;
  }

  const bots = errorSchemas.VALIDATION_ERROR.data.safeParse(error.data).data?.fields.files?.args?.bots;

  return bots === undefined ? undefined : String(bots);
}
