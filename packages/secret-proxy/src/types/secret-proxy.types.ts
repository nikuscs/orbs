import type { SecretSource } from './secret.types';
import type { CompletedRequest, Mockttp, requestSteps } from 'mockttp';

export interface SecretProxyServiceParams {
  source: SecretSource;
  folder: string;
}

export interface SecretProxyServiceDeps extends SecretProxyServiceParams {
  state: SecretProxyState;
}

export interface SecretProxyState {
  token: string;
  server: Mockttp | null;
  starting: Promise<void> | null;
  swapped: Map<string, SecretProxySwap[]>;
}

export interface SecretProxySwap {
  placeholder: string;
  value: string;
}

export interface SecretProxySwapParams {
  request: CompletedRequest;
}

export interface SecretProxyScrubParams {
  response: requestSteps.PassThroughResponse;
  request: CompletedRequest;
}
