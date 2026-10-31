import { getLocale, m } from '@repo/i18n/client';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { ChatContextRow } from '@/components/chat/chat-context-row';
import { Item, ItemContent, ItemGroup, ItemTitle, ItemValue } from '@/components/ui/item';
import type { Bot, ConversationListItem } from '@repo/contracts/universal';

interface BotDetailsFactsProps {
  bot: Bot;
  chat: ConversationListItem;
}

export function BotDetailsFacts({ bot, chat }: BotDetailsFactsProps) {
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });

  const facts = [
    { label: m.rooms_last_activity(), value: chat.lastMessage ? date.format(new Date(chat.lastMessage.createdAt)) : m.rooms_last_activity_none() },
    { label: m.rooms_details_created(), value: date.format(new Date(bot.createdAt)) },
  ];

  return (
    <BotDetailsSection title={m.rooms_details_general()}>
      <ItemGroup>
        <ChatContextRow chat={chat} />
        {facts.map((fact) => (
          <Item key={fact.label} size="sm">
            <ItemContent>
              <ItemTitle>{fact.label}</ItemTitle>
            </ItemContent>
            <ItemValue>{fact.value}</ItemValue>
          </Item>
        ))}
      </ItemGroup>
    </BotDetailsSection>
  );
}
