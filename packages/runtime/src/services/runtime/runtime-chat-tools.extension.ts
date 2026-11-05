import { defineExtension, defineTool, section } from '@earendil-works/pi-durable';
import { GIF, gifToolCall, REACTION } from '@repo/contracts/universal';
import * as m from '@repo/i18n/messages';
import { runtimeGifToolParameters } from '../../types/runtime-gif.types';
import {
  runtimeHistoryToolPage,
  runtimeHistoryToolPageParameters,
  runtimeHistoryToolSearch,
  runtimeHistoryToolSearchParameters,
} from '../../types/runtime-history.types';
import { runtimeReactionTool, runtimeReactionToolParameters } from '../../types/runtime-reaction.types';
import { runtimeHistoryEntries, runtimeHistoryOutput, runtimeHistoryPage } from './runtime-history.utils';
import { runtimeReactionSetBot } from './runtime-reaction.utils';
import { runtimeToolOutput } from './runtime-tool.utils';
import type { RuntimeChatToolsParams } from '../../types/runtime.types';

export function runtimeChatToolsExtension({ gifs }: RuntimeChatToolsParams) {
  const history = defineTool({
    name: 'bot_history',
    description: m.ui_tool_bot_history_description(),
    parameters: runtimeHistoryToolPageParameters,
    replay: 'safe',
    execute: async (params, api, context) => {
      const input = runtimeHistoryToolPage.parse(params);
      return runtimeHistoryOutput(runtimeHistoryPage(await runtimeHistoryEntries(api, input.limit, input.cursor, context)));
    },
  });

  const search = defineTool({
    name: 'bot_search',
    description: m.ui_tool_bot_search_description(),
    parameters: runtimeHistoryToolSearchParameters,
    replay: 'safe',
    execute: async (params, api, context) => {
      const input = runtimeHistoryToolSearch.parse(params);
      return runtimeHistoryOutput(runtimeHistoryPage(await runtimeHistoryEntries(api, input.limit, input.cursor, context), input.query));
    },
  });

  const react = defineTool({
    name: REACTION.toolName,
    description: m.ui_tool_bot_react_description(),
    parameters: runtimeReactionToolParameters,
    replay: 'unsafe',
    execute: async (params, api, context) => {
      return runtimeToolOutput(await runtimeReactionSetBot(api, runtimeReactionTool.parse(params), context));
    },
  });

  const gif = defineTool({
    name: GIF.toolName,
    description: m.ui_tool_bot_gif_description(),
    parameters: runtimeGifToolParameters,
    replay: 'safe',
    execute: async (params) => {
      const { reaction } = gifToolCall.parse(params);
      const details = await gifs.actions.pick({ reaction });

      if (!details) {
        return { isError: true, output: [{ type: 'text' as const, text: m.ui_tool_bot_gif_off() }] };
      }

      return { output: [{ type: 'text' as const, text: m.ui_tool_bot_gif_sent({ reaction }) }], details };
    },
  });

  return {
    extension: defineExtension({
      name: 'bots.chat-tools',
      tools: [history, search, react, gif],
      sections: [
        section('reactions', () => m.ui_tool_bot_react_prompt()),
        section('status', () => m.ui_tool_bot_status_prompt()),
        section('gifs', async () => ((await gifs.queries.provider()) === 'off' ? undefined : m.ui_tool_bot_gif_prompt())),
      ],
    }),
    readOnlyTools: [history, search, react, gif],
  };
}
