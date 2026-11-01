import { useLocalSearchParams } from 'expo-router';
import { BotDetailsScreen } from '@/components/bots/bot-details-screen';
import type { BotDetailsRouteParams } from '@/types/bot-details.types';

export default function BotMediaRoute() {
  const { botId } = useLocalSearchParams<BotDetailsRouteParams>();

  return <BotDetailsScreen botId={botId} page="media" />;
}
