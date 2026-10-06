import { routeQuerySeeing } from './route-query.seeing';
import { routeMentions } from './route.utils';
import type * as RouteTypes from '#/types/route.types';

export async function routeQueryBlind(deps: RouteTypes.RouteServiceDeps, params: RouteTypes.RouteQueryBlindParams): Promise<string[]> {
  const memberIds = new Set(deps.database.all(deps.database.db
    .selectFrom('member')
    .select('botId')
    .where('roomId', '=', params.roomId)).map((member) => member.botId));

  const bots = await deps.bot.queries.list({ organizationId: deps.organizationId });
  const members = bots.filter((bot) => memberIds.has(bot.id));
  const seeing = routeQuerySeeing(deps, { bots: members });
  const blindMentioned = routeMentions(params.text, members).filter((bot) => !seeing.has(bot.id));

  return seeing.size === 0 ? members.map((bot) => bot.name) : blindMentioned.map((bot) => bot.name);
}
