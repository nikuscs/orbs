import { useSuspenseQuery } from '@tanstack/react-query';
import { RoomsChat } from '@/components/rooms/rooms-chat';
import { RoomsStart } from '@/components/rooms/rooms-start';
import { MessageScrollerProvider } from '@/components/ui/message-scroller';
import { rpc } from '@/services/rpc/rpc.client';

export function RoomsPage({ roomId }: { roomId?: string }) {
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const room = rooms.find((item) => item.id === roomId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {room ? (
        <MessageScrollerProvider
          autoScroll
          defaultScrollPosition="end"
          key={room.id}
        >
          <RoomsChat bots={bots} roomId={room.id} />
        </MessageScrollerProvider>
      ) : (
        <RoomsStart />
      )}
    </div>
  );
}
