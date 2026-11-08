import { useSettingsProviders } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { KeyRound, LogIn, LogOut, Plus, RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';
import { match, P } from 'ts-pattern';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { LabelDescription } from '@/components/ui/label';
import { Menu } from '@/components/ui/menu';
import { StatusDot } from '@/components/ui/status-dot';
import { Text } from '@/components/ui/text';
import { SettingsProviderLogo } from './settings-provider-logo';
import { SettingsProviderSession } from './settings-provider-session';
import type { Provider } from '@repo/contracts/universal';

export function SettingsProviders() {
  const router = useRouter();
  const providers = useSettingsProviders();
  const { session } = providers;

  const actions = (provider: Provider) => provider.authTypes.map((authType) => ({
    authType,
    icon: match(authType)
      .with('oauth', () => (provider.isConfigured && provider.credentialType === 'oauth' ? RefreshCw : LogIn))
      .with('api_key', () => KeyRound)
      .exhaustive(),
    label: match(authType)
      .with('oauth', () => (provider.isConfigured && provider.credentialType === 'oauth' ? m.settings_providers_reconnect() : m.settings_providers_sign_in()))
      .with('api_key', () => (provider.isConfigured ? m.settings_providers_update_api_key() : m.settings_providers_api_key()))
      .exhaustive(),
  }));

  return (
    <BotDetailsSection
      icon={KeyRound}
      title={m.settings_providers()}
    >
      {session ? (
        <SettingsProviderSession
          key={session.id}
          session={session}
          onClose={() => providers.dismiss(session.id)}
        />
      ) : null}
      <ItemGroup>
        {providers.connected.length === 0 ? (
          <Item>
            <ItemContent>
              <ItemDescription numberOfLines={0}>{m.settings_providers_empty()}</ItemDescription>
            </ItemContent>
          </Item>
        ) : null}
        {providers.connected.map((provider) => (
          <Item key={provider.id}>
            <ItemMedia className="mt-1 self-start">
              <SettingsProviderLogo providerId={provider.id} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle numberOfLines={1}>{provider.name}</ItemTitle>
              <View className="flex-row items-center gap-1.5">
                <StatusDot label={providers.status(provider).label} variant={providers.status(provider).tone} />
                <Text tone="muted" variant="chat-status">{provider.label ?? providers.status(provider).label}</Text>
              </View>
              {provider.loginCommand ? (
                <ItemDescription numberOfLines={0}>
                  {m.settings_providers_login_command()}
                  {' '}
                  <Text
                    className="font-mono"
                    tone="muted"
                    variant="item-description"
                  >
                    {provider.loginCommand}
                  </Text>
                </ItemDescription>
              ) : null}
            </ItemContent>
            <View className="flex-row gap-1">
              {actions(provider).map((action) => (
                <Button
                  accessibilityLabel={action.label}
                  disabled={providers.isBusy}
                  key={action.authType}
                  size="icon-sm"
                  variant="ghost"
                  onPress={() => providers.login(provider.id, action.authType)}
                >
                  <Icon icon={action.icon} size="sm" />
                </Button>
              ))}
              {provider.source === 'stored' ? (
                <Button
                  accessibilityLabel={m.settings_providers_sign_out()}
                  size="icon-sm"
                  variant="ghost"
                  onPress={() => router.push({ pathname: '/settings/providers/[providerId]/logout', params: { providerId: provider.id } })}
                >
                  <Icon icon={LogOut} size="sm" />
                </Button>
              ) : null}
            </View>
          </Item>
        ))}
      </ItemGroup>
      {providers.available.length > 0 ? (
        <Menu
          isDisabled={providers.isBusy}
          items={providers.available.map((provider) => ({
            label: provider.name,
            items: match(provider.loginCommand)
              .with(P.string, (command) => [{ label: m.settings_providers_login_command_menu({ command }) }])
              .otherwise(() => actions(provider).map((action) => ({ label: action.label, onSelect: () => providers.login(provider.id, action.authType) }))),
          }))}
          title={m.settings_providers_add()}
        >
          <Button size="sm" variant="outline">
            <Icon icon={Plus} size="sm" />
            {m.settings_providers_add()}
          </Button>
        </Menu>
      ) : null}
      {providers.problem ? <LabelDescription accessibilityRole="alert" variant="error">{providers.problem}</LabelDescription> : null}
    </BotDetailsSection>
  );
}
