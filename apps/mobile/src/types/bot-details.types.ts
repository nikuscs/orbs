import type { Bot } from '@repo/contracts/universal';

export interface BotDetailsRouteParams extends Record<string, string | string[] | undefined> {
  botId: string;
}

export interface BotDetailsMcpRemoveRouteParams extends BotDetailsRouteParams {
  server: string;
}

export type BotDetailsPage = 'todos' | 'routines' | 'media';

export interface BotDetailsSectionProps {
  bot: Bot;
  onPrefill: (text: string) => void;
}
