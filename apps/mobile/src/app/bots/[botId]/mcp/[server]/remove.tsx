import { useLocalSearchParams } from 'expo-router';
import { BotMcpRemoveDialog } from '@/components/bots/bot-mcp-remove-dialog';
import type { BotDetailsMcpRemoveRouteParams } from '@/types/bot-details.types';

export default function BotMcpRemoveRoute() {
  const { botId, server } = useLocalSearchParams<BotDetailsMcpRemoveRouteParams>();

  return <BotMcpRemoveDialog botId={botId} server={server} />;
}
