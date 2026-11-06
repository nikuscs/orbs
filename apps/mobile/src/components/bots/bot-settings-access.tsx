import { BOT_PERMISSION_HINTS, BOT_PERMISSION_LABELS } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { Blocks, FileText, Shield, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useController, useFormContext } from 'react-hook-form';
import { Switch } from 'react-native';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { BotSettingsMenuRow } from '@/components/bots/bot-settings-menu-row';
import { BotSettingsSharedRow } from '@/components/bots/bot-settings-shared-row';
import { Icon } from '@/components/ui/icon';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { botMenuPermissions } from '@/services/bot/bot-menu.utils';
import type { RpcSession } from '@/types/rpc.types';
import type { BotInherit } from '@repo/client/client';
import type { Bot, BotForm } from '@repo/contracts/universal';
import type { LucideIcon } from 'lucide-react-native';

const BOT_SETTINGS_INHERIT = [
  { resource: 'agentsFile', icon: FileText, label: m.rooms_bot_global_agents_md },
  { resource: 'plugins', icon: Blocks, label: m.rooms_bot_global_plugins },
] satisfies { resource: BotInherit; icon: LucideIcon; label: () => string }[];

interface BotSettingsAccessProps {
  bot: Bot;
  session: RpcSession;
  isDisabled: boolean;
}

export function BotSettingsAccess({ bot, session, isDisabled }: BotSettingsAccessProps) {
  const form = useFormContext<BotForm>();
  const permission = useController({ control: form.control, name: 'permission' });
  const inherit = useController({ control: form.control, name: 'inherit' });

  return (
    <BotDetailsSection
      icon={ShieldCheck}
      title={m.bots_access()}
    >
      <ItemGroup>
        <BotSettingsMenuRow
          description={BOT_PERMISSION_HINTS[permission.field.value]()}
          icon={Shield}
          isDisabled={isDisabled}
          items={botMenuPermissions({ permission: permission.field.value, onSelect: permission.field.onChange })}
          title={m.rooms_bot_permission()}
          value={BOT_PERMISSION_LABELS[permission.field.value]()}
        />
        {BOT_SETTINGS_INHERIT.map(({ resource, icon, label }) => (
          <Item key={resource}>
            <ItemMedia className="mt-1 self-start">
              <Icon icon={icon} tone="muted" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{label()}</ItemTitle>
            </ItemContent>
            <Switch
              accessibilityLabel={label()}
              disabled={isDisabled}
              value={inherit.field.value.includes(resource)}
              onValueChange={(isOn) => inherit.field.onChange(isOn
                ? [...inherit.field.value, resource]
                : inherit.field.value.filter((item) => item !== resource))}
            />
          </Item>
        ))}
        <BotSettingsSharedRow
          bot={bot}
          icon={Sparkles}
          isDisabled={isDisabled}
          resource="skills"
          session={session}
          title={m.bots_skills()}
        />
      </ItemGroup>
    </BotDetailsSection>
  );
}
