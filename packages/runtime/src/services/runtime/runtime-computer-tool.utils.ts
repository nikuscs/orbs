import * as m from '@repo/i18n/messages';
import { match, P } from 'ts-pattern';
import { runtimeToolTarget } from './runtime-tool.utils';
import type { ComputerToolDeps } from '../../types/computer-tool.types';
import type { Context } from '@earendil-works/chord/context';
import type { ToolExecutionApi, ToolExecutionResult } from '@earendil-works/pi-durable';
import type { ComputerStatus } from '@repo/contracts/universal';

export function runtimeComputerToolText(text: string): ToolExecutionResult {
  return { output: [{ type: 'text', text }] };
}

function runtimeComputerToolBlocked(status: ComputerStatus): ToolExecutionResult | null {
  return match(status.control)
    .with(P.nullish, () => null)
    .with(P.nonNullable, ({ until }) => ({
      isError: true,
      output: [{
        type: 'text' as const,
        text: m.ui_tool_bot_computer_controlled({ time: new Date(until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }),
      }],
    }))
    .exhaustive();
}

export async function runtimeComputerToolEnsure(deps: ComputerToolDeps, context: Context) {
  const status = await deps.computers.queries.status(context);
  await deps.computers.actions.start(context);

  return status;
}

export async function runtimeComputerToolUse(
  deps: ComputerToolDeps,
  api: ToolExecutionApi,
  context: Context,
  options: { isActing: boolean },
  run: (botId: string) => Promise<ToolExecutionResult>,
): Promise<ToolExecutionResult> {
  const { botId } = await runtimeToolTarget(api, context);
  const status = await deps.computers.queries.status(context);

  const blocked = match({ isActing: options.isActing, state: status.state })
    .with({ isActing: true }, () => runtimeComputerToolBlocked(status))
    .with({ isActing: false, state: 'off' }, () => ({ output: [{ type: 'text' as const, text: m.ui_tool_bot_computer_is_off() }] }))
    .with({ isActing: false }, () => null)
    .exhaustive();

  return match(blocked)
    .with(P.nonNullable, (result) => result)
    .otherwise(async () => {
      await deps.computers.actions.start(context);
      const result = await run(botId);
      await deps.computers.actions.touch(context);

      return result;
    });
}

export async function runtimeComputerToolLifecycle(
  deps: ComputerToolDeps,
  context: Context,
  change: () => Promise<void>,
): Promise<ToolExecutionResult> {
  const blocked = runtimeComputerToolBlocked(await deps.computers.queries.status(context));

  return match(blocked)
    .with(P.nonNullable, (result) => result)
    .otherwise(async () => {
      await change();
      return runtimeComputerToolText(JSON.stringify(await deps.computers.queries.status(context)));
    });
}
