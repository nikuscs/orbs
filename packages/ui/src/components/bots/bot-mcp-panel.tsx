import { useBotMcp } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useState } from 'react';
import IconLogIn from '~icons/lucide/log-in';
import IconLogOut from '~icons/lucide/log-out';
import IconX from '~icons/lucide/x';
import { Button } from '../button';
import { FormErrors } from '../forms/form';
import { Input } from '../input';
import { PanelContent, PanelDescription, PanelRow, PanelTitle } from '../panel';
import { SettingsGroup } from '../settings/settings-group';
import { StatusDot } from '../status-dot';
import type { Bot } from '@repo/contracts/universal';

interface BotMcpPanelProps {
  bot: Bot
}

export function BotMcpPanel({ bot }: BotMcpPanelProps) {
  const mcp = useBotMcp({
    botId: bot.id,
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

  return (
    <>
      <SettingsGroup isTitleVisible title={m.bots_mcp_servers()}>
        {mcp.isEmpty ? (
          <PanelRow><PanelDescription>{m.bots_mcp_empty()}</PanelDescription></PanelRow>
        ) : null}
        {mcp.servers.map((server) => (
          <PanelRow className="flex-wrap" key={server.name}>
            <PanelContent>
              <PanelTitle className="truncate">{server.name}</PanelTitle>
              <div className="flex items-center gap-1.5">
                <StatusDot label={mcp.status(server).label} variant={mcp.status(server).tone} />
                <span className="text-xxs text-muted-foreground">
                  {mcp.status(server).label}
                  {server.tools.length > 0 ? ` · ${m.bots_mcp_tools({ count: String(server.tools.length) })}` : null}
                </span>
              </div>
            </PanelContent>
            <div className="flex shrink-0 gap-2">
              {mcp.pending === server.name ? (
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
              {mcp.pending !== server.name && server.auth === 'required' ? (
                <Button
                  disabled={mcp.isBusy || mcp.pending !== null}
                  size="sm"
                  variant="outline"
                  onClick={() => mcp.connect(server.name)}
                >
                  <IconLogIn />
                  {m.bots_mcp_login()}
                </Button>
              ) : null}
              {server.auth === 'authorized' ? (
                <Button
                  disabled={mcp.isBusy}
                  size="sm"
                  variant="outline"
                  onClick={() => mcp.logout(server.name)}
                >
                  <IconLogOut />
                  {m.bots_mcp_logout()}
                </Button>
              ) : null}
            </div>
          </PanelRow>
        ))}
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
      <SettingsGroup isTitleVisible title={m.bots_mcp_available()}>
        {mcp.presets.map((preset) => (
          <PanelRow className="flex-wrap gap-3" key={preset.name}>
            <PanelContent>
              <PanelTitle>{preset.title}</PanelTitle>
              <PanelDescription>{preset.description}</PanelDescription>
              <a className="text-xs text-primary underline-offset-2 hover:underline focus-visible:underline" href={preset.documentation} rel="noreferrer" target="_blank">
                {m.bots_mcp_docs()}
              </a>
            </PanelContent>
            <Button
              disabled={preset.isAdded || mcp.adding !== null}
              size="sm"
              variant="outline"
              onClick={() => mcp.add(preset)}
            >
              {preset.isAdded ? m.bots_mcp_added() : m.bots_mcp_add()}
            </Button>
          </PanelRow>
        ))}
      </SettingsGroup>
    </>
  );
}
