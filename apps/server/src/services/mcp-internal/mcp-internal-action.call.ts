import { Errors, isAppError } from '@orbs/errors/universal';
import { log } from '@orbs/logger/server';
import { match } from 'ts-pattern';
import { roomMessageText } from '#services/room/room.utils';
import { mcpInternalActionBot } from './mcp-internal-action.bot';
import { mcpInternalActionGroup } from './mcp-internal-action.group';
import { mcpInternalActionMemory } from './mcp-internal-action.memory';
import { MCP_INTERNAL } from './mcp-internal.constants';
import type { McpInternalActionCallParams, McpInternalServiceDeps } from '#/types/mcp-internal-service.types';
import type { McpInternalResult } from '#/types/mcp-internal.types';

export async function mcpInternalActionCall(deps: McpInternalServiceDeps, params: McpInternalActionCallParams): Promise<McpInternalResult> {
  try {
    const run = deps.run.queries.get({ runId: params.runId });

    if (run?.status !== 'running') {
      throw new Errors.FORBIDDEN();
    }

    const bot = await deps.bots.queries.get({ organizationId: deps.organizationId, botId: run.botId });
    const room = deps.room.queries.get({ roomId: run.roomId });
    const read = MCP_INTERNAL.readTools.some((name) => name === params.call.name);

    if (!bot || !room?.botIds.includes(bot.id) || (!read && (bot.permission === 'read-only' || run.permission === 'read-only'))) {
      throw new Errors.FORBIDDEN();
    }

    const caller = { run, bot };

    const result = await match(params.call)
      .with(
        { name: 'memory_list' },
        { name: 'memory_search' },
        { name: 'memory_save' },
        { name: 'memory_update' },
        { name: 'memory_forget' },
        { name: 'room_history' },
        (call) => mcpInternalActionMemory(deps, { caller, call }),
      )
      .with({ name: 'bot_list' }, () => deps.bots.queries.list({ organizationId: deps.organizationId }))
      .with({ name: 'bot_get' }, (call) => deps.bots.queries.get({ organizationId: deps.organizationId, ...call.input }))
      .with({ name: 'model_list' }, () => deps.harness.queries.list())
      .with({ name: 'group_list' }, () => deps.room.queries.list().filter((item) => item.kind === 'group'))
      .with({ name: 'group_get' }, (call) => {
        const group = deps.room.queries.get(call.input);

        if (group?.kind !== 'group') {
          return null;
        }

        if (call.input.messages === 0) {
          return group;
        }

        const timeline = deps.room.queries.timeline({ roomId: group.id, limit: call.input.messages });

        const messages =
          timeline?.messages.map((message) => ({
            id: message.id,
            role: message.role,
            authorId: message.authorId,
            authorName: message.authorName,
            text: roomMessageText(message.parts),
            createdAt: message.createdAt,
          })) ?? [];

        return { ...group, messages };
      })
      .with({ name: 'bot_create' }, { name: 'bot_edit' }, { name: 'bot_delete' }, (call) => mcpInternalActionBot(deps, { caller, call }))
      .with({ name: 'group_create' }, { name: 'group_edit' }, { name: 'group_delete' }, (call) =>
        mcpInternalActionGroup(deps, { caller, call }),
      )
      .exhaustive();

    if (result === null || result === undefined) {
      throw new Errors.NOT_FOUND({ resource: params.call.name });
    }

    return { text: JSON.stringify(result), isError: false };
  } catch (error) {
    if (!isAppError(error)) {
      log.error({
        tag: 'mcp-internal',
        message: 'Internal tool failed',
        error,
      });
    }

    return { text: isAppError(error) ? error.code : 'INTERNAL_ERROR', isError: true };
  }
}
