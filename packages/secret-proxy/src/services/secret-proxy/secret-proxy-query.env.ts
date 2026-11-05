import { join } from 'node:path';
import { SECRET_PROXY } from './secret-proxy.constants';
import { secretProxyPassword, secretProxyPlaceholder } from './secret-proxy.utils';
import type { SecretProxyServiceDeps } from '../../types/secret-proxy.types';

export async function secretProxyQueryEnv({ source, state, folder }: SecretProxyServiceDeps): Promise<Record<string, string>> {
  const rules = await source.queries.rules();
  const { server } = state;

  if (!server) {
    return {};
  }

  const proxyUrl = `http://metadata:${secretProxyPassword(state.token)}@127.0.0.1:${server.port}`;
  const bundlePath = join(folder, SECRET_PROXY.bundleFile);

  return {
    ...Object.fromEntries(rules.map((rule) => [rule.name, secretProxyPlaceholder(rule.name)])),
    ...Object.fromEntries(SECRET_PROXY.proxyEnv.map((name) => [name, proxyUrl])),
    ...Object.fromEntries(SECRET_PROXY.noProxyEnv.map((name) => [name, SECRET_PROXY.noProxy])),
    ...Object.fromEntries(SECRET_PROXY.caEnv.map((name) => [name, bundlePath])),
  };
}
