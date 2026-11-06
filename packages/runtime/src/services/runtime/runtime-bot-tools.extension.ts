import { Type } from '@earendil-works/pi-ai';
import { defineExtension, defineTool } from '@earendil-works/pi-durable';
import { botCreate, mcpServerAdd, mcpServerRemove } from '@repo/contracts/universal';
import * as m from '@repo/i18n/messages';
import {
  botToolCreate,
  botToolCreateParameters,
  botToolGet,
  botToolGetParameters,
  botToolMcpAdd,
  botToolMcpAddParameters,
  botToolMcpRemove,
  botToolMcpRemoveParameters,
  botToolSwapModels,
  botToolSwapModelsParameters,
  botToolUpdate,
  botToolUpdateParameters,
} from '../../types/bot-tool.types';
import { runtimeQueryModels } from './runtime-query.models';
import { runtimeToolOutput, runtimeToolTarget } from './runtime-tool.utils';
import type { RuntimeBotToolsDeps } from '../../types/runtime-bot-tools.types';

export function runtimeBotToolsExtension(deps: RuntimeBotToolsDeps) {
  const get = defineTool({
    name: 'bot_get',
    description: m.ui_tool_bot_get_description(),
    parameters: botToolGetParameters,
    replay: 'safe',
    execute: async (params) => {
      const input = botToolGet.parse(params);
      return runtimeToolOutput(await deps.bots.queries.get(input));
    },
  });

  const create = defineTool({
    name: 'bot_create',
    description: m.ui_tool_bot_create_description(),
    parameters: botToolCreateParameters,
    replay: 'unsafe',
    execute: async (params) => {
      const input = botCreate.parse(botToolCreate.parse(params));
      return runtimeToolOutput(await deps.bots.actions.create(input));
    },
  });

  const update = defineTool({
    name: 'bot_update',
    description: m.ui_tool_bot_update_description(),
    parameters: botToolUpdateParameters,
    replay: 'unsafe',
    execute: async (params) => {
      const input = botToolUpdate.parse(params);
      return runtimeToolOutput(await deps.bots.actions.update(input));
    },
  });

  const swapModels = defineTool({
    name: 'bot_swap_models',
    description: m.ui_tool_bot_swap_models_description(),
    parameters: botToolSwapModelsParameters,
    replay: 'unsafe',
    execute: async (params) => {
      const input = botToolSwapModels.parse(params);
      return runtimeToolOutput(await deps.bots.actions.swapModels(input));
    },
  });

  const catalog = defineTool({
    name: 'bot_catalog',
    description: m.ui_tool_bot_catalog_description(),
    parameters: botToolGetParameters,
    replay: 'safe',
    execute: async (params) => {
      const input = botToolGet.parse(params);
      return runtimeToolOutput(await deps.bots.queries.catalog(input));
    },
  });

  const mcpList = defineTool({
    name: 'bot_mcp_list',
    description: m.ui_tool_bot_mcp_list_description(),
    parameters: Type.Object({}, { additionalProperties: false }),
    replay: 'safe',
    execute: async (_params, api, context) => {
      const { botId } = await runtimeToolTarget(api, context);
      return runtimeToolOutput(await deps.bots.queries.mcp({ botId }));
    },
  });

  const mcpAdd = defineTool({
    name: 'bot_mcp_add',
    description: m.ui_tool_bot_mcp_add_description(),
    parameters: botToolMcpAddParameters,
    replay: 'unsafe',
    execute: async (params, api, context) => {
      const input = botToolMcpAdd.parse(params);
      const { botId } = await runtimeToolTarget(api, context);
      return runtimeToolOutput(await deps.bots.actions.addMcp(mcpServerAdd.parse({ ...input, botId })));
    },
  });

  const mcpRemove = defineTool({
    name: 'bot_mcp_remove',
    description: m.ui_tool_bot_mcp_remove_description(),
    parameters: botToolMcpRemoveParameters,
    replay: 'unsafe',
    execute: async (params, api, context) => {
      const input = botToolMcpRemove.parse(params);
      const { botId } = await runtimeToolTarget(api, context);
      await deps.bots.actions.removeMcp(mcpServerRemove.parse({ ...input, botId }));

      return runtimeToolOutput({ removed: input.name });
    },
  });

  const models = defineTool({
    name: 'bot_model_list',
    description: m.ui_tool_bot_model_list_description(),
    parameters: Type.Object({}, { additionalProperties: false }),
    replay: 'safe',
    execute: async () => runtimeToolOutput(await runtimeQueryModels(deps)),
  });

  return {
    extension: defineExtension({
      name: 'bots.bot-tools',
      tools: [get, create, update, swapModels, catalog, models, mcpList, mcpAdd, mcpRemove],
    }),
    readOnlyTools: [get, catalog, models, mcpList],
  };
}
