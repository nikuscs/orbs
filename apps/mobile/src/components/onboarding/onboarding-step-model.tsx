import { useSettingsProviders } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { match, P } from 'ts-pattern';
import { OnboardingSceneModel } from '@/components/onboarding/onboarding-scene-model';
import { OnboardingStepLayout } from '@/components/onboarding/onboarding-step-layout';
import { SettingsProviderLogo } from '@/components/settings/settings-provider-logo';
import { SettingsProviderSession } from '@/components/settings/settings-provider-session';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { LabelDescription } from '@/components/ui/label';
import { Menu } from '@/components/ui/menu';
import { StatusDot } from '@/components/ui/status-dot';
import { Text } from '@/components/ui/text';
import type { Provider, ProviderAuthType } from '@repo/contracts/universal';

export function OnboardingStepModel() {
  const router = useRouter();
  const { session, status, connected, available, featured, isBusy, problem, login, dismiss } = useSettingsProviders();
  const others = available.filter((provider) => !featured.includes(provider));
  const visible = [...connected, ...featured.filter((provider) => !provider.isConfigured)];
  const isReady = connected.length > 0;

  const authLabel = (provider: Provider, authType: ProviderAuthType) => match(authType)
    .with('oauth', () => (provider.isConfigured && provider.credentialType === 'oauth' ? m.settings_providers_reconnect() : m.settings_providers_sign_in()))
    .with('api_key', () => (provider.isConfigured ? m.settings_providers_update_api_key() : m.settings_providers_api_key()))
    .exhaustive();

  return (
    <OnboardingStepLayout
      hasBack
      description={m.onboarding_model_description()}
      primary={(
        <Button
          className="w-full"
          disabled={!isReady}
          size="lg"
          onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: 'approvals' } })}
        >
          {m.onboarding_next()}
        </Button>
      )}
      scene={<OnboardingSceneModel connected={connected} featured={featured} />}
      step="model"
      title={m.onboarding_model_title()}
    >
      <View className="gap-3">
        {session ? (
          <SettingsProviderSession
            key={session.id}
            session={session}
            onClose={() => dismiss(session.id)}
          />
        ) : null}
        <ItemGroup>
          {visible.map((provider) => (
            <Item key={provider.id}>
              <ItemMedia className="mt-1 self-start">
                <SettingsProviderLogo providerId={provider.id} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle numberOfLines={1}>{provider.name}</ItemTitle>
                <View className="flex-row items-center gap-1.5">
                  <StatusDot label={status(provider).label} variant={status(provider).tone} />
                  <Text tone="muted" variant="chat-status">{status(provider).label}</Text>
                </View>
              </ItemContent>
              <View className="flex-row gap-1.5">
                {provider.authTypes.map((authType) => (
                  <Button
                    disabled={isBusy}
                    key={authType}
                    size="sm"
                    variant="outline"
                    onPress={() => login(provider.id, authType)}
                  >
                    {authLabel(provider, authType)}
                  </Button>
                ))}
              </View>
            </Item>
          ))}
        </ItemGroup>
        {others.length > 0 ? (
          <Menu
            isDisabled={isBusy}
            items={others.map((provider) => ({
              label: provider.name,
              items: match(provider.loginCommand)
                .with(P.string, (command) => [{ label: m.settings_providers_login_command_menu({ command }) }])
                .otherwise(() => provider.authTypes.map((authType) => ({
                  label: authLabel(provider, authType),
                  onSelect: () => login(provider.id, authType),
                }))),
            }))}
            title={m.onboarding_model_more()}
          >
            <Button size="sm" variant="outline">
              <Icon icon={Plus} size="sm" />
              {m.onboarding_model_more()}
            </Button>
          </Menu>
        ) : null}
        {isReady ? null : <LabelDescription>{m.onboarding_model_required()}</LabelDescription>}
        {problem ? <LabelDescription accessibilityRole="alert" variant="error">{problem}</LabelDescription> : null}
      </View>
    </OnboardingStepLayout>
  );
}
