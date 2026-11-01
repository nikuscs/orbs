import { useLocalSearchParams } from 'expo-router';
import { ChatViewerScreen } from '@/components/chat/chat-viewer';
import type { ChatMediaRouteParams } from '@/types/chat.types';

export default function BotMediaViewerRoute() {
  const { botId, attachmentId, entryId } = useLocalSearchParams<ChatMediaRouteParams>();

  return (
    <ChatViewerScreen
      attachmentId={attachmentId}
      botId={botId}
      entryId={entryId ? Number(entryId) : undefined}
    />
  );
}
