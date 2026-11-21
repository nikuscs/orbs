import { createHmac } from 'node:crypto';
import { SECRET_PROXY } from './secret-proxy.constants';
import type { SecretRule } from '../../types/secret.types';
import type { CompletedRequest, Headers } from 'mockttp';

export function secretProxyPlaceholder(token: string, name: string) {
  const tag = createHmac('sha256', token).update(name).digest('hex').slice(0, SECRET_PROXY.placeholderTagLength);
  return `${SECRET_PROXY.placeholderPrefix}${name}-${tag}${SECRET_PROXY.placeholderSuffix}`;
}

export function secretProxyAllows(rule: SecretRule, host: string) {
  return rule.hosts.some((pattern) => (pattern.startsWith('*.') ? host.endsWith(pattern.slice(1)) : host === pattern));
}

export function secretProxyIsLocal(address: string | undefined) {
  return SECRET_PROXY.loopback.some((loopback) => loopback === address);
}

export function secretProxyCarries(request: CompletedRequest) {
  return JSON.stringify([request.url, request.headers]).includes(SECRET_PROXY.placeholderPrefix);
}

export function secretProxyMapHeaders(headers: Headers, map: (value: string) => string): Headers {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value.map(map) : value && map(value)]));
}

