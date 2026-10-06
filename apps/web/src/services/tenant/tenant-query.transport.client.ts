import { isTextUIPart } from 'ai';
import { roomSendOptions } from '@orbs/server/client';
import { rpc } from '../rpc/rpc.client';
import type { TenantTransportParams } from '@/types/tenant.types';
import type { RoomUIMessage } from '@orbs/server/client';
import type { ChatTransport, UIMessageChunk } from 'ai';

export function tenantQueryTransport({ roomId }: TenantTransportParams): ChatTransport<RoomUIMessage> {
  return {
    sendMessages: async ({ messages, body }) => {
      const outgoing = messages.at(-1);

      const text = outgoing?.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('\n') ?? '';

      const options = roomSendOptions.safeParse(body ?? {});
      await rpc.rooms.send.call({
        roomId,
        messageId: outgoing?.id,
        text,
        fileIds: options.success ? options.data.fileIds : [],
        replyToMessageId: options.success ? options.data.replyToMessageId : undefined,
      });
      const noReplyStream = new ReadableStream<UIMessageChunk>({ start: (controller) => controller.close() });

      return noReplyStream;
    },
    reconnectToStream: async () => null,
  };
}
