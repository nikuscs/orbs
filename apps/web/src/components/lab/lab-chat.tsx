import { cn } from '@repo/ui/cn';
import { MessageScrollerProvider } from '@repo/ui/message-scroller';
import { PaneHost, usePaneHost } from '@repo/ui/pane';
import { RoomsChatPill } from '@repo/ui/rooms/rooms-chat-pill';
import { RoomsChatRuns } from '@repo/ui/rooms/rooms-chat-runs';
import { RoomsChatStatus } from '@repo/ui/rooms/rooms-chat-status';
import { QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { RoomsChatComposer } from '@/components/rooms/rooms-chat-composer';
import { RoomsChatTranscript } from '@/components/rooms/rooms-chat-transcript';
import type { LabChatFixture } from '@/types/lab.types';
import type { ChatMessage } from '@repo/client/client';
import type { PromptInputEditorHandle } from '@repo/ui/ai/prompt-input-editor';
import type { QueryClient } from '@tanstack/react-query';

interface LabChatViewProps {
  fixture: LabChatFixture
}

function LabChatView({ fixture }: LabChatViewProps) {
  const { bot, bots, messages, draft, activity } = fixture;
  const composer = useRef<PromptInputEditorHandle>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const panes = usePaneHost();
  const latestEntryId = messages.at(-1)?.metadata?.entryId ?? 0;

  function reply(message: ChatMessage) {
    setReplyTo(message);
    composer.current?.focus();
  }

  const measureComposer = (node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(() => setComposerHeight(node.offsetHeight));
    observer.observe(node);

    return () => observer.disconnect();
  };

  return (
    <PaneHost
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      host={panes}
      insetBottom={composerHeight}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-12 pt-3 *:pointer-events-auto">
        <RoomsChatPill activity={activity} bot={bot} />
      </div>
      <RoomsChatTranscript
        bot={bot}
        bots={bots}
        composerHeight={composerHeight}
        focusedEntryId={undefined}
        footer={(
          <RoomsChatRuns
            activity={activity}
            approvals={fixture.approvals}
            bot={bot}
            bots={bots}
            draft={draft}
            failure={null}
            questions={fixture.questions}
          />
        )}
        messages={[...messages, draft]}
        older={{ isEnabled: false, isLoading: false, onLoad: () => undefined }}
        reactions={fixture.reactions}
        onReply={reply}
      />
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 *:pointer-events-auto', panes.isOpen ? 'z-30' : 'z-10')} ref={measureComposer}>
        <RoomsChatComposer
          isBusy
          bot={bot}
          bots={bots}
          conversationId={1}
          editor={composer}
          latestEntryId={latestEntryId}
          messages={messages}
          queued={fixture.queued}
          replyTo={replyTo}
          status={panes.isOpen ? (
            <RoomsChatStatus
              activity={activity}
              bot={bot}
              draft={draft}
              onOpen={panes.closeAll}
            />
          ) : undefined}
          onOutgoingChange={() => undefined}
          onReplyChange={setReplyTo}
          onSend={panes.closeAll}
        />
      </div>
    </PaneHost>
  );
}

interface LabChatProps {
  fixture: LabChatFixture
  queryClient: QueryClient
}

export function LabChat({ fixture, queryClient }: LabChatProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessageScrollerProvider>
          <LabChatView fixture={fixture} />
        </MessageScrollerProvider>
      </div>
    </QueryClientProvider>
  );
}
