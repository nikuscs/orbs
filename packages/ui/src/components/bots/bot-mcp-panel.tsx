import { useBotMcp } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconLogIn from '~icons/lucide/log-in';
import IconLogOut from '~icons/lucide/log-out';
import IconPower from '~icons/lucide/power';
import IconTrash2 from '~icons/lucide/trash-2';
import IconX from '~icons/lucide/x';
import { Button } from '../button';
import { ButtonGroup } from '../button-group';
import { Combobox } from '../combobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { FormErrors } from '../forms/form';
import { Input } from '../input';
import { PanelContent, PanelDescription, PanelRow, PanelTitle } from '../panel';
import { SettingsGroup } from '../settings/settings-group';
import { StatusDot } from '../status-dot';
import { Switch } from '../switch';
import { BotMcpLogo } from './bot-mcp-logo';
import type { BotMcpRow } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';

const BOT_MCP_SEARCH_MIN = 8;

interface BotMcpPanelProps {
  bot: Bot
}

export function BotMcpPanel({ bot }: BotMcpPanelProps) {
  const mcp = useBotMcp({
    bot,
    login: () => {
      const isDesktop = document.documentElement.dataset.shell === 'desktop';

      return {
        redirectUrl: `${window.location.origin}/mcp/callback`,
        returnUrl: isDesktop ? undefined : window.location.href,
        open: (url) => (isDesktop ? void window.open(url, '_blank') : window.location.assign(url)),
      };
    },
  });

  const [callbackUrl, setCallbackUrl] = useState('');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visible = mcp.rows.filter((row) => row.name.toLowerCase().includes(query));

  return (
    <SettingsGroup title={m.bots_mcp()}>
      {mcp.isEmpty ? (
        <PanelRow><PanelDescription>{m.bots_mcp_empty()}</PanelDescription></PanelRow>
      ) : null}
      {mcp.presets.length > 0 ? (
        <PanelRow>
          <Combobox
            aria-label={m.bots_mcp_add()}
            disabled={mcp.adding !== null}
            groups={[{ options: mcp.presets.map((preset) => ({
              value: preset.name,
              label: preset.title,
              icon: <BotMcpLogo name={preset.name} />,
            })) }]}
            placeholder={m.bots_mcp_add()}
            value=""
            onValueChange={(name) => {
              const preset = mcp.presets.find((candidate) => candidate.name === name);

              if (preset) {
                mcp.add(preset);
              }
            }}
          />
        </PanelRow>
      ) : null}
      {mcp.rows.length > BOT_MCP_SEARCH_MIN ? (
        <PanelRow>
          <Input
            aria-label={m.bots_mcp_search()}
            placeholder={m.bots_mcp_search()}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </PanelRow>
      ) : null}
      {visible.map((row) => (
        <PanelRow className="flex-wrap" key={row.name}>
          <BotMcpLogo name={row.name} />
          <PanelContent className="min-w-24">
            <PanelTitle className="truncate" title={row.server?.source}>{row.name}</PanelTitle>
            <div className="flex items-center gap-1.5">
              <StatusDot label={mcp.status(row).label} variant={mcp.status(row).tone} />
              <span className="text-xxs text-muted-foreground">
                {mcp.status(row).label}
                {row.server && row.server.tools.length > 0 ? ` · ${m.bots_mcp_tools({ count: String(row.server.tools.length) })}` : null}
              </span>
            </div>
          </PanelContent>
          {row.isShared && !row.needsLogin ? (
            <Switch
              aria-label={m.bots_mcp_use({ server: row.name })}
              checked={row.isOn}
              disabled={mcp.isBusy}
              onCheckedChange={(isOn) => mcp.toggle(row.name, isOn)}
            />
          ) : (
            <BotMcpPanelActions
              bot={bot}
              mcp={mcp}
              row={row}
            />
          )}
        </PanelRow>
      ))}
      {mcp.rows.length > 0 && visible.length === 0 ? (
        <PanelRow><PanelDescription>{m.bots_mcp_no_match()}</PanelDescription></PanelRow>
      ) : null}
      {mcp.pending ? (
        <PanelRow className="flex-col items-stretch">
          <PanelContent>
            <PanelTitle>{m.bots_mcp_paste_label()}</PanelTitle>
            <PanelDescription>{m.bots_mcp_paste_hint()}</PanelDescription>
          </PanelContent>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              mcp.paste(callbackUrl.trim());
            }}
          >
            <Input
              aria-label={m.bots_mcp_paste_label()}
              placeholder={m.bots_mcp_paste_placeholder()}
              value={callbackUrl}
              onChange={(event) => setCallbackUrl(event.target.value)}
            />
            <Button
              disabled={mcp.isBusy || callbackUrl.trim() === ''}
              size="sm"
              type="submit"
            >
              {m.bots_mcp_paste_submit()}
            </Button>
          </form>
        </PanelRow>
      ) : null}
      {mcp.problem ? <PanelRow><FormErrors error={mcp.problem} /></PanelRow> : null}
    </SettingsGroup>
  );
}

interface BotMcpPanelActionsProps {
  bot: Bot
  row: BotMcpRow
  mcp: ReturnType<typeof useBotMcp>
}

function BotMcpPanelActions({ bot, row, mcp }: BotMcpPanelActionsProps) {
  const navigate = useNavigate();
  const { name, server } = row;

  if (!server) {
    return null;
  }

  const isPending = mcp.pending === name;
  const needsLogin = !isPending && server.auth === 'required';
  const canTurnOff = row.isShared && row.isOn;
  const hasMenu = server.auth === 'authorized' || server.isOwned || canTurnOff;

  return (
    <ButtonGroup aria-label={m.bots_mcp_actions({ server: name })}>
      {isPending ? (
        <Button
          disabled={mcp.isBusy}
          size="sm"
          variant="outline"
          onClick={mcp.cancel}
        >
          <IconX />
          {m.bots_mcp_cancel()}
        </Button>
      ) : null}
      {needsLogin ? (
        <Button
          disabled={mcp.isBusy || mcp.pending !== null}
          size="sm"
          variant="outline"
          onClick={() => mcp.connect(name)}
        >
          <IconLogIn />
          {m.bots_mcp_login()}
        </Button>
      ) : null}
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={m.bots_mcp_actions({ server: name })}
              disabled={mcp.isBusy}
              size="icon-sm"
              title={m.bots_mcp_actions({ server: name })}
              type="button"
              variant={isPending || needsLogin ? 'outline' : 'ghost'}
            >
              <IconEllipsisVertical className="opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {server.auth === 'authorized' ? (
              <DropdownMenuItem onSelect={() => mcp.logout(name)}>
                <IconLogOut />
                {m.bots_mcp_logout()}
              </DropdownMenuItem>
            ) : null}
            {canTurnOff ? (
              <DropdownMenuItem onSelect={() => mcp.toggle(name, false)}>
                <IconPower />
                {m.bots_mcp_turn_off()}
              </DropdownMenuItem>
            ) : null}
            {server.auth === 'authorized' && server.isOwned ? <DropdownMenuSeparator /> : null}
            {server.isOwned ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => void navigate({
                  to: '/bots/$botId/mcp/$server/remove',
                  params: { botId: bot.id, server: name },
                  resetScroll: false,
                })}
              >
                <IconTrash2 />
                {m.bots_mcp_remove()}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </ButtonGroup>
  );
}
