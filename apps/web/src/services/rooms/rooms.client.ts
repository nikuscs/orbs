import { linkOptions, notFound } from '@tanstack/react-router';
import { rpc } from '@/services/rpc/rpc.client';
import type { Bot } from '@repo/contracts/universal';
import type { RoomsPairLinkParams } from '@repo/ui/rooms.types';
import type { QueryClient } from '@tanstack/react-query';

export async function roomsDirectBot(queryClient: QueryClient, { handle }: Pick<Bot, 'handle'>) {
  const bots = await queryClient.ensureQueryData(rpc.bots.list.queryOptions());
  const bot = bots.find((item) => item.handle === handle);

  if (!bot) {
    throw notFound();
  }

  return bot;
}

export function roomsLink({ handle }: Pick<Bot, 'handle'>) {
  return linkOptions({ to: '/rooms/direct/$handle', params: { handle } });
}

export function roomsPairLink({ sender, peer, conversationId }: RoomsPairLinkParams) {
  return linkOptions({ to: '/rooms/direct/$handle/with/$peer/$conversationId', params: { handle: sender.handle, peer: peer.handle, conversationId: String(conversationId) } });
}
