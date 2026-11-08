import { registerBunOAuthFlows } from '@earendil-works/pi-ai/bun-oauth';
import { createClaudeCodeProvider } from '@earendil-works/pi-claude-code/src/index';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { providerActionCancel } from './provider-action.cancel';
import { providerActionCancelDevice } from './provider-action.cancel-device';
import { providerActionComplete } from './provider-action.complete';
import { providerActionLogin } from './provider-action.login';
import { providerActionLogout } from './provider-action.logout';
import { providerQueryList } from './provider-query.list';
import { providerQuerySession } from './provider-query.session';
import { providerClose } from './provider.utils';
import type * as ProviderTypes from '../../types/provider.types';

export async function makeProviderService(): Promise<ProviderTypes.ProviderService> {
  registerBunOAuthFlows();
  const models = await ModelRuntime.create();
  models.registerNativeProvider(createClaudeCodeProvider());
  const deps: ProviderTypes.ProviderServiceDeps = { models, sessions: new Map() };

  return {
    models,
    actions: {
      login: (params) => providerActionLogin(deps, params),
      complete: (params) => providerActionComplete(deps, params),
      cancel: (params) => providerActionCancel(deps, params),
      logout: (params) => providerActionLogout(deps, params),
      cancelDevice: (params) => providerActionCancelDevice(deps, params),
    },
    queries: {
      list: (params) => providerQueryList(deps, params),
      session: (params) => providerQuerySession(deps, params),
    },
    close: () => providerClose(deps),
  };
}
