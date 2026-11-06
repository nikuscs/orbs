import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { ItemButton, ItemContent, ItemMedia, ItemTitle, ItemValue } from '@/components/ui/item';
import { useBotShared } from '@/hooks/use-bot-shared';
import { botSharedSelected } from '@/services/bot/bot-shared.utils';
import type { BotSharedResource } from '@/types/bot-shared.types';
import type { RpcSession } from '@/types/rpc.types';
import type { Bot } from '@repo/contracts/universal';
import type { LucideIcon } from 'lucide-react-native';

interface BotSettingsSharedRowProps {
  bot: Bot;
  session: RpcSession;
  resource: BotSharedResource;
  icon: LucideIcon;
  title: string;
  isDisabled: boolean;
}

export function BotSettingsSharedRow({ bot, session, resource, icon, title, isDisabled }: BotSettingsSharedRowProps) {
  const router = useRouter();

  const list = useBotShared({
    session,
    botId: bot.id,
    resource,
  });

  const names = list.items?.map((item) => item.name);

  const selected = names
    ? botSharedSelected({
      resource,
      names,
      inherit: bot.inherit,
      shared: bot[list.field],
    })
    : null;

  return (
    <ItemButton
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={() => router.push({ pathname: '/bots/[botId]/skills', params: { botId: bot.id } })}
    >
      <ItemMedia>
        <Icon icon={icon} tone="muted" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
      </ItemContent>
      {selected && names ? <ItemValue>{m.bots_pick_selected({ selected: String(selected.size), total: String(names.length) })}</ItemValue> : null}
      <Icon
        icon={ChevronRight}
        size="sm"
        tone="muted"
      />
    </ItemButton>
  );
}
