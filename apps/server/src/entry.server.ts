export type { Services } from './types/services.types';
export { securityExtractClientIp, securityReadRequestText } from './services/security/security.utils';
export { jsonObject, jsonString, jsonValue } from './types/json.types';

export async function getRpcHandler() {
  const { rpcHandler } = await import('./rpc/rpc.handler-http');

  return rpcHandler;
}

export type { JsonValue } from './types/json.types';
