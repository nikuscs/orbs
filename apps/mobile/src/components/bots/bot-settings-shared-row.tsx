import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { match } from 'ts-pattern';
import { Icon } from '@/components/ui/icon';
import { ItemButton, ItemContent, ItemMedia, ItemTitle, ItemValue } from '@/components/ui/item';
import { useBotShared } from '@/hooks/use-bot-shared';
import { botSharedSelected, botSharedSkillsSummary } from '@/services/bot/bot-shared.utils';
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

  const localSkills = useQuery({ ...session.rpc.skills.local.queryOptions({ input: { botId: bot.id } }), enabled: resource === 'skills' });
  const names = list.items?.map((item) => item.name);

  const selected = names
    ? botSharedSelected({
      resource,
      names,
      inherit: bot.inherit,
      shared: bot[list.field],
    })
    : null;

  const summary = selected && names
    ? match(resource)
      .with('skills', () => localSkills.data && botSharedSkillsSummary({
        sharedSelected: selected.size,
        sharedTotal: names.length,
        localNames: localSkills.data.map((skill) => skill.name),
        disabled: bot.disabledSkills,
      }))
      .with('mcp', () => m.bots_pick_selected({ selected: String(selected.size), total: String(names.length) }))
      .exhaustive()
    : null;

  return (
    <ItemButton
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={() => router.push({ pathname: resource === 'skills' ? '/bots/[botId]/skills' : '/bots/[botId]/mcp', params: { botId: bot.id } })}
    >
      <ItemMedia>
        <Icon icon={icon} tone="muted" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
      </ItemContent>
      {summary ? <ItemValue>{summary}</ItemValue> : null}
      <Icon
        icon={ChevronRight}
        size="sm"
        tone="muted"
      />
    </ItemButton>
  );
}
