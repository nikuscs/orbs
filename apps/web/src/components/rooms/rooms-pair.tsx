import { chatActivityMessage, chatActivityStartedAt, chatPairMessages } from '@repo/client/client';
import { chatQueries, useChatRoom } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { Button } from '@repo/ui/button';
import { MessageScrollerProvider } from '@repo/ui/message-scroller';
import { PaneFooter, PaneHeader } from '@repo/ui/pane';
import { RoomsChatRuns } from '@repo/ui/rooms/rooms-chat-runs';
import { RoomsPairPill } from '@repo/ui/rooms/rooms-pair-pill';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { RoomsChatTranscript } from '@/components/rooms/rooms-chat-transcript';
import { roomsLink } from '@/services/rooms/rooms.client';
import { rpc } from '@/services/rpc/rpc.client';
import { RPC_CONTEXT } from '@/services/rpc/rpc.constants';
import type { Bot, ConversationView } from '@repo/contracts/universal';

interface RoomsPairViewProps {
  sender: Bot
  peer: Bot
  bots: Bot[]
  view: ConversationView
}

function RoomsPairView({ sender, peer, bots, view }: RoomsPairViewProps) {
  const room = useChatRoom({
    bot: peer,
    bots,
    view,
    outgoing: [],
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PaneHeader>
        <RoomsPairPill peer={peer} sender={sender} />
      </PaneHeader>
      <RoomsChatTranscript
        isReadOnly
        bot={peer}
        bots={bots}
        focusedEntryId={undefined}
        footer={(
          <RoomsChatRuns
            activity={room.activity}
            approvals={room.approvals}
            bot={peer}
            draft={chatActivityMessage(room.messages)}
            failure={room.failure}
            questions={room.questions}
            startedAt={chatActivityStartedAt(room.messages)}
          />
        )}
        messages={chatPairMessages(room.messages, sender.id)}
        older={room.older}
        reactions={room.reactions}
        onReply={() => undefined}
      />
      <PaneFooter>
        <Button asChild variant="outline">
          <Link {...roomsLink(sender)}>{m.rooms_pair_close()}</Link>
        </Button>
      </PaneFooter>
    </div>
  );
}

interface RoomsPairProps {
  sender: Bot
  peer: Bot
  conversationId: number
}

export function RoomsPair({ sender, peer, conversationId }: RoomsPairProps) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { data: view } = useQuery(chatQueries.view(RPC_CONTEXT, { botId: peer.id, conversationId }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {view ? (
        <MessageScrollerProvider>
          <RoomsPairView
            bots={bots}
            peer={peer}
            sender={sender}
            view={view}
          />
        </MessageScrollerProvider>
      ) : null}
    </div>
  );
}
