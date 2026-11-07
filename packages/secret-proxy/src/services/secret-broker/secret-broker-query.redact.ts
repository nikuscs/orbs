import { SECRET_BROKER } from './secret-broker.constants';
import type { SecretBrokerRedactParams, SecretBrokerServiceDeps } from '../../types/secret-broker.types';

export async function secretBrokerQueryRedact({ source, proxy }: SecretBrokerServiceDeps, { text }: SecretBrokerRedactParams) {
  const rules = await source.queries.rules();
  const values = await Promise.all(rules.map(async ({ name }) => ({ name, value: await source.queries.value({ name }) })));

  return values.reduce((result, { name, value }) => (
    value && value.length >= SECRET_BROKER.redactMinLength ? result.replaceAll(value, proxy.queries.placeholder({ name })) : result
  ), text);
}
