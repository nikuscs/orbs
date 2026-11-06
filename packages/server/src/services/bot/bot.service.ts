import { botActionArrange } from './bot-action.arrange';
import { botActionClearHistory } from './bot-action.clear-history';
import { botActionConfigure } from './bot-action.configure';
import { botActionConnectMcp } from './bot-action.connect-mcp';
import { botActionCreate } from './bot-action.create';
import { botActionDelete } from './bot-action.delete';
import { botActionMarkRead } from './bot-action.mark-read';
import { botActionRestore } from './bot-action.restore';
import { botActionSetPreferences } from './bot-action.set-preferences';
import { botActionSwapModels } from './bot-action.swap-models';
import { botActionUpdate } from './bot-action.update';
import { botPreferenceScheduleExpiry } from './bot-preference.utils';
import { botQueryCatalog } from './bot-query.catalog';
import { botQueryGet } from './bot-query.get';
import { botQueryInstructions } from './bot-query.instructions';
import { botQueryList } from './bot-query.list';
import { botQueryLocalSkills } from './bot-query.local-skills';
import { botQueryMcp } from './bot-query.mcp';
import { botQueryPlugins } from './bot-query.plugins';
import { botQueryPreferences } from './bot-query.preferences';
import { botQuerySharedMcp } from './bot-query.shared-mcp';
import { botQuerySharedSkills } from './bot-query.shared-skills';
import { botQuerySkills } from './bot-query.skills';
import { botQueryUsage } from './bot-query.usage';
import type * as BotTypes from '../../types/bot.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeBotService(deps: Omit<BotTypes.BotServiceDeps, 'queues' | 'changes' | 'muteExpiry'>) {
  const serviceDeps: BotTypes.BotServiceDeps = {
    ...deps,
    queues: new Map(),
    changes: new Set(),
    muteExpiry: { timer: undefined },
  };

  return {
    onChange: (listener: BotTypes.BotChangeListener) => {
      serviceDeps.changes.add(listener);
      void botPreferenceScheduleExpiry(serviceDeps);

      return () => {
        serviceDeps.changes.delete(listener);
        void botPreferenceScheduleExpiry(serviceDeps);
      };
    },
    actions: {
      configure: (params: UniversalTypes.BotGetInput) => botActionConfigure(serviceDeps, params),
      connectMcp: (params: UniversalTypes.BotGetInput) => botActionConnectMcp(serviceDeps, params),
      restore: () => botActionRestore(serviceDeps),
      create: (params: UniversalTypes.BotCreateInput) => botActionCreate(serviceDeps, params),
      swapModels: (params: UniversalTypes.BotSwapModelsInput) => botActionSwapModels(serviceDeps, params),
      update: (params: UniversalTypes.BotUpdateInput) => botActionUpdate(serviceDeps, params),
      delete: (params: UniversalTypes.BotGetInput) => botActionDelete(serviceDeps, params),
      clearHistory: (params: UniversalTypes.BotGetInput) => botActionClearHistory(serviceDeps, params),
      setPreferences: (params: BotTypes.BotPreferencesUpdate) => botActionSetPreferences(serviceDeps, params),
      markRead: (params: BotTypes.BotMarkReadParams) => botActionMarkRead(serviceDeps, params),
      arrange: (params: BotTypes.BotArrangeParams) => botActionArrange(serviceDeps, params),
    },
    queries: {
      plugins: (params: UniversalTypes.BotGetInput) => botQueryPlugins(serviceDeps, params),
      instructions: (params: UniversalTypes.BotGetInput) => botQueryInstructions(serviceDeps, params),
      catalog: (params: UniversalTypes.BotGetInput) => botQueryCatalog(serviceDeps, params),
      skills: (params: UniversalTypes.BotGetInput) => botQuerySkills(serviceDeps, params),
      sharedSkills: (params: UniversalTypes.BotGetInput) => botQuerySharedSkills(serviceDeps, params),
      localSkills: (params: UniversalTypes.BotGetInput) => botQueryLocalSkills(serviceDeps, params),
      sharedMcp: (params: UniversalTypes.BotGetInput) => botQuerySharedMcp(serviceDeps, params),
      mcp: (params: UniversalTypes.BotGetInput) => botQueryMcp(serviceDeps, params),
      usage: (params: UniversalTypes.BotGetInput) => botQueryUsage(serviceDeps, params),
      list: () => botQueryList(serviceDeps),
      preferences: () => botQueryPreferences(serviceDeps),
      get: (params: UniversalTypes.BotGetInput) => botQueryGet(serviceDeps, params),
    },
  };
}

export type BotService = ReturnType<typeof makeBotService>;
