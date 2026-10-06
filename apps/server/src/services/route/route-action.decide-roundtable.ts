import { routePicks, routeRequired } from './route.utils';
import type { Bot } from '#/types/bot.types';
import type * as RouteTypes from '#/types/route.types';

export function routeActionDecideRoundtable(deps: RouteTypes.RouteDriverRoundtableDeps, params: RouteTypes.RouteDecideParams): RouteTypes.RouteDecision {
  function routeRoundtableSeats(serviceDeps: RouteTypes.RouteDriverRoundtableDeps, input: RouteTypes.RouteDecideParams): RouteTypes.RouteResponder[] {
    const { db } = serviceDeps.database;

    const rotation = serviceDeps.database.all(db
      .selectFrom('room')
      .select('rotation')
      .where('id', '=', input.message.roomId)).at(0)?.rotation ?? 0;

    const joined = serviceDeps.database.all(db
      .selectFrom('member')
      .select('botId')
      .where('roomId', '=', input.message.roomId)
      .orderBy('createdAt')
      .orderBy('botId'));

    const ordered = joined.flatMap((member) => input.candidates.filter((bot) => bot.id === member.botId));
    const backstop = input.leader && ordered.includes(input.leader) ? input.leader : ordered.at(-1);
    const others = ordered.filter((bot) => bot !== backstop);
    const start = others.length > 0 ? rotation % others.length : 0;
    const turned: Bot[] = [...others.slice(start), ...others.slice(0, start)];

    return [
      ...turned.map((bot): RouteTypes.RouteResponder => ({ bot, seat: 'optional' })),
      ...(backstop ? [{ bot: backstop, seat: 'backstop' } satisfies RouteTypes.RouteResponder] : []),
    ];
  }

  const { message, mentioned, quoted } = params;

  if (mentioned.length > 0) {
    const quotedThenMentioned = [...quoted, ...mentioned.filter((bot) => !quoted.includes(bot))];

    return { responders: routeRequired(quotedThenMentioned), route: { via: 'mention', picks: routePicks(quotedThenMentioned, () => null) } };
  }

  if (quoted.length > 0) {
    return { responders: routeRequired(quoted), route: { via: 'reply', picks: routePicks(quoted, () => null) } };
  }

  if (message.role === 'assistant') {
    return { responders: [], route: { via: 'none', picks: [] } };
  }

  const seats = routeRoundtableSeats(deps, params);

  return { responders: seats, route: { via: 'roundtable', picks: routePicks(seats.map((seat) => seat.bot), () => null) } };
}
