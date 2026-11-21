import { m } from '@repo/i18n/client';
import { match, P } from 'ts-pattern';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconKeyRound from '~icons/lucide/key-round';
import IconLogIn from '~icons/lucide/log-in';
import IconLogOut from '~icons/lucide/log-out';
import IconRefreshCw from '~icons/lucide/refresh-cw';
import { Button } from '../button';
import { ButtonGroup } from '../button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { PanelContent, PanelRow, PanelTitle } from '../panel';
import { StatusDot } from '../status-dot';
import { SettingsProviderLogo } from './settings-provider-logo';
import type { SettingsProviderStatus } from '@repo/client/react';
import type { Provider, ProviderAuthType } from '@repo/contracts/universal';

interface SettingsProviderRowProps {
  provider: Provider
  status: SettingsProviderStatus
  isBusy: boolean
  onLogin: (providerId: string, authType: ProviderAuthType) => void
  onSignOut?: () => void
}

export function SettingsProviderRow({ provider, status, isBusy, onLogin, onSignOut }: SettingsProviderRowProps) {
  return (
    <PanelRow className="flex-wrap">
      <SettingsProviderLogo providerId={provider.id} />
      <PanelContent className="min-w-24">
        <PanelTitle className="truncate">{provider.name}</PanelTitle>
        <div className="flex items-center gap-1.5">
          <StatusDot label={status.label} variant={status.tone} />
          <span className="text-xxs text-muted-foreground">{provider.label ?? status.label}</span>
        </div>
      </PanelContent>
      {match(provider)
        .with({ loginCommand: P.string }, ({ loginCommand }) => (
          <p className="text-xxs text-muted-foreground">
            {m.settings_providers_login_command()}
            {' '}
            <code className="font-mono">{loginCommand}</code>
          </p>
        ))
        .with({ isConfigured: true }, () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={m.settings_providers_actions({ provider: provider.name })}
                disabled={isBusy}
                size="icon-sm"
                title={m.settings_providers_actions({ provider: provider.name })}
                type="button"
                variant="ghost"
              >
                <IconEllipsisVertical className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {provider.authTypes.map((authType) => (
                <DropdownMenuItem key={authType} onSelect={() => onLogin(provider.id, authType)}>
                  <SettingsProviderRowLoginLabel authType={authType} provider={provider} />
                </DropdownMenuItem>
              ))}
              {onSignOut ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                    <IconLogOut />
                    {m.settings_providers_sign_out()}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ))
        .otherwise(() => (
          <ButtonGroup aria-label={m.settings_providers_actions({ provider: provider.name })}>
            {provider.authTypes.map((authType) => (
              <Button
                disabled={isBusy}
                key={authType}
                size="sm"
                variant="outline"
                onClick={() => onLogin(provider.id, authType)}
              >
                <SettingsProviderRowLoginLabel authType={authType} provider={provider} />
              </Button>
            ))}
          </ButtonGroup>
        ))}
    </PanelRow>
  );
}

interface SettingsProviderRowLoginLabelProps {
  provider: Provider
  authType: ProviderAuthType
}

function SettingsProviderRowLoginLabel({ provider, authType }: SettingsProviderRowLoginLabelProps) {
  return (
    <>
      {match(authType)
        .with('oauth', () => provider.isConfigured && provider.credentialType === 'oauth' ? <IconRefreshCw /> : <IconLogIn />)
        .with('api_key', () => <IconKeyRound />)
        .exhaustive()}
      {match(authType)
        .with('oauth', () => provider.isConfigured && provider.credentialType === 'oauth' ? m.settings_providers_reconnect() : m.settings_providers_sign_in())
        .with('api_key', () => provider.isConfigured ? m.settings_providers_update_api_key() : m.settings_providers_api_key())
        .exhaustive()}
    </>
  );
}
