import { useBotMcpRemove } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { SettingsConfirm } from '@repo/ui/settings/settings-confirm';
import { SettingsGroup } from '@repo/ui/settings/settings-group';
import { SettingsSubview } from '@repo/ui/settings/settings-subview';
import { useNavigate } from '@tanstack/react-router';
import type { Bot } from '@repo/contracts/universal';

interface BotMcpRemoveProps {
  bot: Bot
  server: string
}

export function BotMcpRemove({ bot, server }: BotMcpRemoveProps) {
  const navigate = useNavigate();

  const onBack = () => void navigate({
    to: '/bots/$botId/$tab',
    params: { botId: bot.id, tab: 'mcp' },
    replace: true,
  });

  const remove = useBotMcpRemove({ onDone: onBack });

  return (
    <SettingsSubview
      backLabel={m.bots_mcp()}
      description={m.bots_mcp_remove_description({ bot: bot.name, server })}
      isBackDisabled={remove.isPending}
      title={m.bots_mcp_remove_title({ server })}
      onBack={onBack}
    >
      <SettingsGroup title={m.bots_mcp_remove()}>
        <SettingsConfirm
          confirmLabel={m.bots_mcp_remove()}
          error={remove.problem}
          pending={remove.isPending}
          onCancel={onBack}
          onConfirm={() => remove.remove(bot.id, server)}
        />
      </SettingsGroup>
    </SettingsSubview>
  );
}
