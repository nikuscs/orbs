import { botActionCreate } from './bot-action.create';
import { botActionDelete } from './bot-action.delete';
import { botActionUpdate } from './bot-action.update';
import { botQueryGet } from './bot-query.get';
import { botQueryList } from './bot-query.list';
import type * as BotTypes from '#/types/bot.types';

export function makeBotService(deps: BotTypes.BotServiceDeps) {
  return {
    queries: {
      list: (params: BotTypes.BotQueryListParams) => botQueryList(deps, params),
      get: (params: BotTypes.BotQueryGetParams) => botQueryGet(deps, params),
    },
    actions: {
      create: (params: BotTypes.BotActionCreateParams) => botActionCreate(deps, params),
      delete: (params: BotTypes.BotActionDeleteParams) => botActionDelete(deps, params),
      update: (params: BotTypes.BotActionUpdateParams) => botActionUpdate(deps, params),
    },
  };
}

export type BotService = ReturnType<typeof makeBotService>;
