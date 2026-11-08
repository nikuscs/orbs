import { defineExtension, defineTool } from '@earendil-works/pi-durable';
import * as m from '@repo/i18n/messages';
import { match } from 'ts-pattern';
import {
  computerToolAct,
  computerToolActInput,
  computerToolActParameters,
  computerToolBrowserAct,
  computerToolBrowserActParameters,
  computerToolBrowserOpen,
  computerToolBrowserOpenParameters,
  computerToolBrowserTab,
  computerToolBrowserTabParameters,
  computerToolEmptyParameters,
  computerToolHandoff,
  computerToolHandoffParameters,
  computerToolRead,
  computerToolReadParameters,
} from '../../types/computer-tool.types';
import { COMPUTER } from '../computer/computer.constants';
import { QUESTION } from '../question/question.constants';
import { runtimeComputerToolEnsure, runtimeComputerToolLifecycle, runtimeComputerToolText, runtimeComputerToolUse } from './runtime-computer-tool.utils';
import { runtimeToolOutput, runtimeToolTarget } from './runtime-tool.utils';
import type { ComputerToolDeps } from '../../types/computer-tool.types';
import type { ToolExecutionResult } from '@earendil-works/pi-durable';

export function runtimeComputerToolsExtension(deps: ComputerToolDeps) {
  const status = defineTool({
    name: 'bot_computer_status',
    description: m.ui_tool_bot_computer_status_description(),
    parameters: computerToolEmptyParameters,
    replay: 'safe',
    execute: async (_params, _api, context) => runtimeToolOutput(await deps.computers.queries.status(context)),
  });

  const start = defineTool({
    name: 'bot_computer_start',
    description: m.ui_tool_bot_computer_start_description(),
    parameters: computerToolEmptyParameters,
    replay: 'unsafe',
    execute: (_params, _api, context) => runtimeComputerToolLifecycle(deps, context, () => deps.computers.actions.start(context)),
  });

  const sleep = defineTool({
    name: 'bot_computer_sleep',
    description: m.ui_tool_bot_computer_sleep_description(),
    parameters: computerToolEmptyParameters,
    replay: 'unsafe',
    execute: (_params, _api, context) => runtimeComputerToolLifecycle(deps, context, () => deps.computers.actions.sleep(context)),
  });

  const shutdown = defineTool({
    name: 'bot_computer_shutdown',
    description: m.ui_tool_bot_computer_shutdown_description(),
    parameters: computerToolEmptyParameters,
    replay: 'unsafe',
    execute: (_params, _api, context) => runtimeComputerToolLifecycle(deps, context, () => deps.computers.actions.shutdown(context)),
  });

  const windows = defineTool({
    name: 'bot_computer_windows',
    description: m.ui_tool_bot_computer_windows_description(),
    parameters: computerToolEmptyParameters,
    replay: 'safe',
    execute: (_params, api, context) => runtimeComputerToolUse(deps, api, context, { isActing: false }, async (botId) => (
      runtimeToolOutput(await deps.host.queries.windows({ botId }))
    )),
  });

  const read = defineTool({
    name: 'bot_computer_read',
    description: m.ui_tool_bot_computer_read_description(),
    parameters: computerToolReadParameters,
    replay: 'safe',
    execute: (params, api, context) => {
      const input = computerToolRead.parse(params);

      return runtimeComputerToolUse(deps, api, context, { isActing: false }, (botId) => match(input.mode)
        .with('tree', async () => runtimeComputerToolText(await deps.host.queries.tree({ botId, windowId: input.windowId })))
        .with('screenshot', async (): Promise<ToolExecutionResult> => {
          const image = await deps.host.queries.screenshot({
            botId,
            windowId: input.windowId,
            maxDimension: COMPUTER.screenshot.maxDimension,
            format: COMPUTER.screenshot.format,
          });

          const note = match(input.windowId)
            .with(undefined, () => m.ui_tool_bot_computer_screenshot({
              width: image.width,
              height: image.height,
              screenWidth: COMPUTER.display.width,
              screenHeight: COMPUTER.display.height,
              scale: Number((COMPUTER.display.width / image.width).toFixed(3)),
            }))
            .otherwise(() => m.ui_tool_bot_computer_window_screenshot({
              width: image.width,
              height: image.height,
              screenWidth: COMPUTER.display.width,
              screenHeight: COMPUTER.display.height,
            }));

          return { output: [{ type: 'image', data: image.data, mimeType: image.mimeType }, { type: 'text', text: note }] };
        })
        .exhaustive());
    },
  });

  const act = defineTool({
    name: 'bot_computer_act',
    description: m.ui_tool_bot_computer_act_description(),
    parameters: computerToolActParameters,
    replay: 'unsafe',
    execute: (params, api, context) => {
      const parsed = computerToolAct.safeParse(computerToolActInput.parse(params));

      return match(parsed)
        .with({ success: false }, ({ error }): Promise<ToolExecutionResult> => Promise.resolve({
          isError: true,
          output: [{ type: 'text', text: m.ui_tool_bot_computer_action_invalid({ issues: error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ') }) }],
        }))
        .with({ success: true }, ({ data }) => runtimeComputerToolUse(deps, api, context, { isActing: true }, async (botId) => {
          await deps.host.actions.act({ botId, input: data });
          return runtimeComputerToolText(m.ui_tool_bot_computer_acted());
        }))
        .exhaustive();
    },
  });

  const handoff = defineTool({
    name: 'bot_computer_handoff',
    description: m.ui_tool_bot_computer_handoff_description(),
    parameters: computerToolHandoffParameters,
    replay: 'safe',
    execute: async (params, api, context) => {
      const input = computerToolHandoff.parse(params);
      await runtimeToolTarget(api, context);
      await runtimeComputerToolEnsure(deps, context);
      await deps.computers.actions.touch(context);

      const done = m.ui_tool_bot_computer_handoff_done();

      await deps.computers.actions.handoff({
        conversationId: api.conversationId,
        questionId: api.taskId,
        choice: done,
        until: Date.now() + QUESTION.timeoutMs,
      }, context);

      const answer = await deps.questions.actions.ask({
        input: {
          text: m.ui_tool_bot_computer_handoff_question({ instructions: input.instructions }),
          choices: [done],
        },
        api,
      }, context);

      await deps.computers.actions.releaseControl({ deviceId: null }, context);

      return answer;
    },
  });

  const browserOpen = defineTool({
    name: 'bot_browser_open',
    description: m.ui_tool_bot_browser_open_description(),
    parameters: computerToolBrowserOpenParameters,
    replay: 'unsafe',
    execute: (params, api, context) => {
      const input = computerToolBrowserOpen.parse(params);

      return runtimeComputerToolUse(deps, api, context, { isActing: true }, async (botId) => (
        runtimeToolOutput(await deps.host.actions.browser({ botId, input: { call: 'open', url: input.url } }))
      ));
    },
  });

  const browserSnapshot = defineTool({
    name: 'bot_browser_snapshot',
    description: m.ui_tool_bot_browser_snapshot_description(),
    parameters: computerToolEmptyParameters,
    replay: 'safe',
    execute: (_params, api, context) => runtimeComputerToolUse(deps, api, context, { isActing: false }, async (botId) => (
      runtimeToolOutput(await deps.host.actions.browser({ botId, input: { call: 'snapshot' } }))
    )),
  });

  const browserAct = defineTool({
    name: 'bot_browser_act',
    description: m.ui_tool_bot_browser_act_description(),
    parameters: computerToolBrowserActParameters,
    replay: 'unsafe',
    execute: (params, api, context) => {
      const input = computerToolBrowserAct.parse(params);

      return runtimeComputerToolUse(deps, api, context, { isActing: true }, async (botId) => (
        runtimeToolOutput(await deps.host.actions.browser({ botId, input: { call: 'act', ...input } }))
      ));
    },
  });

  const browserTabs = defineTool({
    name: 'bot_browser_tabs',
    description: m.ui_tool_bot_browser_tabs_description(),
    parameters: computerToolEmptyParameters,
    replay: 'safe',
    execute: (_params, api, context) => runtimeComputerToolUse(deps, api, context, { isActing: false }, async (botId) => (
      runtimeToolOutput(await deps.host.actions.browser({ botId, input: { call: 'tabs' } }))
    )),
  });

  const browserTab = defineTool({
    name: 'bot_browser_tab',
    description: m.ui_tool_bot_browser_tab_description(),
    parameters: computerToolBrowserTabParameters,
    replay: 'unsafe',
    execute: (params, api, context) => {
      const tab = computerToolBrowserTab.parse(params);

      return runtimeComputerToolUse(deps, api, context, { isActing: true }, async (botId) => (
        runtimeToolOutput(await deps.host.actions.browser({ botId, input: { call: 'tabs', tab } }))
      ));
    },
  });

  const tools = [status, start, sleep, shutdown, windows, read, act, handoff, browserOpen, browserSnapshot, browserAct, browserTabs, browserTab];

  return {
    extension: defineExtension({ name: COMPUTER.toolsExtension, tools }),
    readOnlyTools: [status, windows, read, browserSnapshot, browserTabs],
  };
}
