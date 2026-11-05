import { secretProxyActionStart } from './secret-proxy-action.start';
import { secretProxyActionStop } from './secret-proxy-action.stop';
import { secretProxyQueryEnv } from './secret-proxy-query.env';
import { secretProxyPlaceholder, secretProxyRedact } from './secret-proxy.utils';
import type * as SecretProxyTypes from '../../types/secret-proxy.types';
import type { SecretValueParams } from '../../types/secret.types';

export function makeSecretProxyService(params: SecretProxyTypes.SecretProxyServiceParams) {
  const deps: SecretProxyTypes.SecretProxyServiceDeps = {
    ...params,
    state: { token: '', server: null, starting: null, swapped: new Map() },
  };

  return {
    actions: {
      start: () => secretProxyActionStart(deps),
      stop: () => secretProxyActionStop(deps),
    },
    queries: {
      env: () => secretProxyQueryEnv(deps),
      redact: (text: string) => deps.state.token ? secretProxyRedact(deps.state.token, text) : text,
      placeholder: ({ name }: SecretValueParams) => secretProxyPlaceholder(name),
    },
  };
}

export type SecretProxyService = ReturnType<typeof makeSecretProxyService>;
