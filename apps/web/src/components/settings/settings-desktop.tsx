import { useClipboardCopy } from '@repo/client/web';
import { env } from '@repo/env/client';
import { m } from '@repo/i18n/client';
import { Button } from '@repo/ui/button';
import { PanelContent, PanelDescription, PanelRow, PanelTitle } from '@repo/ui/panel';
import { SettingsGroup } from '@repo/ui/settings/settings-group';
import { toasty } from '@repo/ui/sonner';
import { StatusDot } from '@repo/ui/status-dot';
import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';
import { useDesktopUpdate } from '@/hooks/use-desktop-update';
import { rpc } from '@/services/rpc/rpc.client';
import IconCopy from '~icons/lucide/copy';

export function SettingsDesktop() {
  const desktop = window.__electrobunSendToHost;
  const server = useQuery({ ...rpc.server.info.queryOptions(), enabled: Boolean(desktop) });
  const clipboard = useClipboardCopy();
  const update = useDesktopUpdate();
  let status = m.desktop_connection_checking();
  let variant: 'default' | 'success' | 'destructive' = 'default';

  if (server.isSuccess || server.isError) {
    status = server.isSuccess ? m.desktop_connection_connected() : m.desktop_connection_offline();
    variant = server.isSuccess ? 'success' : 'destructive';
  }

  if (!desktop) {
    return null;
  }

  const addresses = window.__botsAddresses ?? [];

  return (
    <SettingsGroup title={m.settings_desktop()}>
      <PanelRow>
        <span className="flex size-4 shrink-0 items-center justify-center"><StatusDot label={status} variant={variant} /></span>
        <PanelContent>
          <span className="text-sm font-medium">{status}</span>
          <PanelDescription className="truncate">{window.location.host}</PanelDescription>
        </PanelContent>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => desktop({ connection: true })}
        >
          {m.desktop_change()}
        </Button>
      </PanelRow>
      {update ? (
        <PanelRow>
          <PanelContent>
            <span className="text-sm font-medium">{m.desktop_update_version({ version: update.version })}</span>
            <PanelDescription>{update.status === 'ready' ? m.desktop_update_ready({ name: env.VITE_APP_NAME, version: update.available ?? '' }) : null}</PanelDescription>
          </PanelContent>
          <Button
            disabled={update.status === 'checking' || update.status === 'downloading'}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => desktop({ update: update.status === 'ready' ? 'apply' : 'check' })}
          >
            {match(update.status)
              .with('ready', () => m.desktop_update_restart_action())
              .with('downloading', () => m.desktop_update_downloading())
              .otherwise(() => m.desktop_update_check_action())}
          </Button>
        </PanelRow>
      ) : null}
      {addresses.length > 0 ? (
        <PanelRow className="items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <PanelTitle asChild><h3>{m.desktop_connection_share({ name: env.VITE_APP_NAME })}</h3></PanelTitle>
            {addresses.map((address) => (
              <div className="flex items-center justify-between gap-4" key={address}>
                <span className="truncate font-mono text-xs">{address}</span>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => void clipboard.copy(address)
                    .then(() => toasty(m.desktop_connection_copied(), '📋'))
                    .catch(() => toasty(m.ui_copy_failed(), '🔴'))}
                >
                  <IconCopy />
                  {m.desktop_copy()}
                </Button>
              </div>
            ))}
          </div>
        </PanelRow>
      ) : null}
    </SettingsGroup>
  );
}
