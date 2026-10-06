import { Errors } from '@orbs/errors/universal';
import { botCreateInput } from '#/types/bot.types';
import type { McpInternalActionBotParams, McpInternalServiceDeps } from '#/types/mcp-internal-service.types';

export async function mcpInternalActionBot(deps: McpInternalServiceDeps, { caller, call }: McpInternalActionBotParams) {
  if (call.name === 'bot_delete') {
    if (call.input.botId === caller.bot.id) {
      throw new Errors.FORBIDDEN();
    }

    await deps.room.actions.deleteBot(call.input);

    return { deleted: call.input.botId };
  }

  const target = call.name === 'bot_edit'
    ? await deps.bots.queries.get({ organizationId: deps.organizationId, botId: call.input.botId })
    : caller.bot;

  if (!target) {
    throw new Errors.NOT_FOUND({ resource: 'bot' });
  }

  if (call.name === 'bot_edit' && Object.keys(call.input).every((key) => key === 'botId')) {
    return target;
  }

  const changesModel = call.input.harnessId !== undefined
    || call.input.modelProvider !== undefined
    || call.input.modelId !== undefined
    || call.input.thinkingLevel !== undefined;

  if (call.name === 'bot_create' || changesModel) {
    const model = { ...target, ...call.input };

    const available = deps.harness.queries.list()
      .find((harness) => harness.harnessId === model.harnessId)?.providers
      .find((provider) => provider.id === model.modelProvider)?.models
      .find((item) => item.id === model.modelId);

    if (!available?.thinkingLevels.includes(model.thinkingLevel)) {
      throw new Errors.NOT_FOUND({ resource: 'model', resourceId: model.modelId });
    }
  }

  const bot = call.name === 'bot_create'
    ? await deps.bots.actions.create({
      organizationId: deps.organizationId,
      ...botCreateInput.parse({
        harnessId: caller.bot.harnessId,
        modelProvider: caller.bot.modelProvider,
        modelId: caller.bot.modelId,
        thinkingLevel: caller.bot.thinkingLevel,
        permission: caller.bot.permission === 'ask' ? 'ask' : 'auto',
        ...call.input,
      }),
    })
    : await deps.bots.actions.update({ organizationId: deps.organizationId, ...call.input });

  deps.route.actions.invalidate();
  deps.sockets.broadcast({ type: 'bot.updated', botId: bot.id });

  return bot;
}
