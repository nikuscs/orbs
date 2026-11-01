import { getLocale, m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { CHAT } from '../services/chat/chat.constants';
import { chatMessages } from '../services/chat/chat.utils';
import { roomsFileImages, roomsTimeLabel } from '../services/rooms/rooms.utils';
import { useRpc } from './use-rpc';
import type { ChatViewerParams } from '../types/chat.types';
import type { RoomsFilePart } from '../types/rooms.types';

export function useChatViewer({ bot, entryId, attachmentId }: ChatViewerParams) {
  const { rpc } = useRpc();
  const url = `${CHAT.attachmentScheme}${attachmentId}`;

  const { data: page } = useQuery({
    ...rpc.conversation.history.queryOptions({ input: { botId: bot.id, afterEntryId: Math.max(0, (entryId ?? 1) - 1), limit: CHAT.aroundPageSize } }),
    enabled: entryId !== undefined,
  });

  const messages = chatMessages({
    entries: page?.items ?? [],
    bot,
    bots: [],
  });

  const message = messages.find((item) => entryId !== undefined && item.metadata?.entryIds.includes(entryId));
  const found = roomsFileImages(message);
  const metadata = found.some((file) => file.url === url) ? message?.metadata : undefined;
  const fallback: RoomsFilePart = { type: 'file', mediaType: 'image/*', url };
  const images = metadata ? found : [fallback];

  const time = metadata ? roomsTimeLabel({
    createdAt: metadata.createdAt,
    now: new Date(),
    locale: getLocale(),
  }) : undefined;

  return {
    images,
    index: Math.max(0, images.findIndex((file) => file.url === url)),
    caption: metadata && time ? m.rooms_media_viewer_from({ name: metadata.authorName, time }) : undefined,
  };
}
