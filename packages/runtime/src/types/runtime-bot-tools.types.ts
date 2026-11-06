import type { RuntimeSharedDeps } from './runtime.types';
import type { Models } from '@earendil-works/pi-ai/models';
import type * as UniversalTypes from '@repo/contracts/universal';

export interface RuntimeBotToolsBots {
  actions: {
    swapModels: (params: UniversalTypes.BotSwapModelsInput) => Promise<UniversalTypes.BotSwapModelsResult>;
    create: (params: UniversalTypes.BotCreateInput) => Promise<UniversalTypes.Bot>;
    update: (params: UniversalTypes.BotUpdateInput) => Promise<UniversalTypes.Bot>;
    addMcp: (params: UniversalTypes.McpServerAddInput) => Promise<UniversalTypes.McpCatalog['servers'][number]>;
    removeMcp: (params: UniversalTypes.McpServerRemoveInput) => Promise<UniversalTypes.Bot>;
  };
  queries: {
    catalog: (params: UniversalTypes.BotGetInput) => Promise<UniversalTypes.BotCatalog>;
    get: (params: UniversalTypes.BotGetInput) => Promise<UniversalTypes.Bot>;
    mcp: (params: UniversalTypes.BotGetInput) => Promise<UniversalTypes.McpCatalog>;
  };
}

export interface RuntimeBotToolsRegisterParams {
  bots: RuntimeBotToolsBots;
}

export interface RuntimeBotToolsDeps extends RuntimeBotToolsRegisterParams {
  models: Models;
}

export type RuntimeBotToolsRegisterDeps = Pick<RuntimeSharedDeps, 'extensions' | 'readOnlyTools' | 'models'>;
