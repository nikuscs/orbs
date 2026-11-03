import { linkOptions, notFound } from '@tanstack/react-router';
import { ROOMS } from '@/services/rooms/rooms.constants';
import { rpc, rpcClient } from '@/services/rpc/rpc.client';
import type { Bot } from '@repo/contracts/universal';
import type { RoomsMediaSource, RoomsPairLinkParams } from '@repo/ui/rooms.types';
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

export function roomsMediaPlayElsewhere() {
  const host = window.__electrobunSendToHost;

  if (!host || document.createElement('video').canPlayType(ROOMS.mediaH264) !== '') {
    return undefined;
  }

  return async ({ botId, attachmentId, name }: RoomsMediaSource) => {
    const bytes = new Uint8Array(await (await rpcClient.attachments.download({ botId, attachmentId })).arrayBuffer());
    const chunks: string[] = [];

    for (let index = 0; index < bytes.length; index += ROOMS.mediaChunkBytes) {
      chunks.push(String.fromCharCode(...bytes.subarray(index, index + ROOMS.mediaChunkBytes)));
    }

    host({ openMedia: { name, data: btoa(chunks.join('')) } });
  };
}
