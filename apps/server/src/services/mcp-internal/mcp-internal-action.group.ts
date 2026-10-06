import { Errors } from '@orbs/errors/universal';
import { roomInputCreate } from '#/types/room-input.types';
import type { McpInternalActionGroupParams, McpInternalServiceDeps } from '#/types/mcp-internal-service.types';

export async function mcpInternalActionGroup(deps: McpInternalServiceDeps, { caller, call }: McpInternalActionGroupParams) {
  if (call.name === 'group_create') {
    return deps.room.actions.create(call.input);
  }

  const room = deps.room.queries.get(call.input);

  if (room?.kind !== 'group') {
    throw new Errors.NOT_FOUND({ resource: 'group', resourceId: call.input.roomId });
  }

  if (call.name === 'group_delete') {
    if (room.id === caller.run.roomId) {
      throw new Errors.FORBIDDEN();
    }

    deps.room.actions.delete({ roomId: room.id, kind: 'group' });

    return { deleted: room.id };
  }

  const { addBotIds = [], removeBotIds = [], leaderBotId, ...fields } = call.input;
  const members = [...new Set([...room.botIds, ...addBotIds])].filter((id) => !removeBotIds.includes(id));
  const leader = leaderBotId ?? (members.includes(room.leaderBotId ?? '') ? room.leaderBotId : members.at(0));

  if (!leader || !members.includes(leader) || (room.id === caller.run.roomId && !members.includes(caller.bot.id))) {
    throw new Errors.FORBIDDEN();
  }

  const botIds = roomInputCreate.shape.botIds.safeParse([leader, ...members.filter((id) => id !== leader)]);

  if (!botIds.success) {
    throw new Errors.FORBIDDEN();
  }

  return deps.room.actions.update({ ...fields, botIds: botIds.data });
}
