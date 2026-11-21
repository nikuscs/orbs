import { match, P } from 'ts-pattern';
import { providerDeviceSession, providerLoginCommand, providerSessionView } from './provider.utils';
import type * as ProviderTypes from '../../types/provider.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function providerQueryList(
  deps: ProviderTypes.ProviderServiceDeps,
  params: ProviderTypes.ProviderListParams,
): UniversalTypes.ProviderList {
  return {
    providers: deps.models.getProviders().map((provider) => {
      const status = deps.models.getProviderAuthStatus(provider.id);
      const loginCommand = providerLoginCommand(provider.id);

      return {
        id: provider.id,
        name: provider.name,
        authTypes: match(loginCommand)
          .with(P.string, () => [])
          .otherwise(() => [
            ...match(provider.auth.oauth)
              .with(P.nonNullable, () => ['oauth' as const])
              .otherwise(() => []),
            ...match(provider.auth.apiKey)
              .with(P.nullish, () => [])
              .when((apiKey) => apiKey.login !== undefined, () => ['api_key' as const])
              .otherwise(() => []),
          ]),
        ...match(provider.auth.oauth?.loginLabel)
          .with(P.string, (loginLabel) => ({ loginLabel }))
          .otherwise(() => ({})),
        ...match(loginCommand)
          .with(P.string, (command) => ({ loginCommand: command }))
          .otherwise(() => ({})),
        isSubscription: provider.auth.oauth?.isSubscription === true,
        isConfigured: status.configured,
        ...match(status.configured)
          .with(true, () => ({
            credentialType: match(deps.models.isUsingOAuth(provider.id))
              .with(true, () => 'oauth' as const)
              .with(false, () => 'api_key' as const)
              .exhaustive(),
          }))
          .with(false, () => ({}))
          .exhaustive(),
        ...match(status.source)
          .with(P.nonNullable, (source) => ({ source }))
          .otherwise(() => ({})),
        ...match(status.label)
          .with(P.string, (label) => ({ label }))
          .otherwise(() => ({})),
      };
    }),
    session: match(providerDeviceSession(deps, params))
      .with(P.nonNullable, (session) => providerSessionView(session))
      .otherwise(() => null),
  };
}
