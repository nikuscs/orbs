import { routeQuerySeeing } from './route-query.seeing';
import { ROUTE } from './route.constants';
import { routeHandleMentions, routeMentions, routePicks, routeRequired } from './route.utils';
import type { Bot } from '#/types/bot.types';
import type * as RouteTypes from '#/types/route.types';

export async function routeQueryPlan(deps: RouteTypes.RouteServiceDeps, params: RouteTypes.RouteQueryPlanParams): Promise<RouteTypes.RoutePlan> {
  function routeRepliesLeft(serviceDeps: RouteTypes.RouteServiceDeps, input: RouteTypes.RouteQueryPlanParams): number {
    const { db } = serviceDeps.database;

    const human = serviceDeps.database.all(db
      .selectFrom('message')
      .select((eb) => eb.fn.coalesce(eb.fn.max('seq'), eb.lit(0)).as('seq'))
      .where('roomId', '=', input.roomId)
      .where('role', '=', 'user')
      .where('reactionId', 'is', null)).at(0)?.seq ?? 0;

    const replies = serviceDeps.database.all(db
      .selectFrom('message')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('roomId', '=', input.roomId)
      .where('role', '=', 'assistant')
      .where('seq', '>', human)).at(0)?.count ?? 0;

    const pending = serviceDeps.database.all(db
      .selectFrom('run')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('roomId', '=', input.roomId)
      .where('status', 'in', ['queued', 'running'])
      .where('seat', '=', 'required')).at(0)?.count ?? 0;

    return ROUTE.replies - replies - pending;
  }

  function routeUpgradable(serviceDeps: RouteTypes.RouteServiceDeps, input: RouteTypes.RouteQueryPlanParams): Set<string> {
    return new Set(serviceDeps.database.all(serviceDeps.database.db
      .selectFrom('run')
      .select('botId')
      .where('roomId', '=', input.roomId)
      .where('status', '=', 'queued')
      .where('seat', '!=', 'required')).map((run) => run.botId));
  }

  async function routeLoad(serviceDeps: RouteTypes.RouteServiceDeps, memberIds: Set<string>): Promise<RouteTypes.RouteCache> {
    const { cache } = serviceDeps;
    const known = [...memberIds].every((botId) => cache.bots.some((bot) => bot.id === botId));

    if (!known || Date.now() - cache.loadedAt > ROUTE.botCacheTtlMs) {
      const [bots, settings] = await Promise.all([
        serviceDeps.bot.queries.list({ organizationId: serviceDeps.organizationId }),
        serviceDeps.organization.queries.settings({ organizationId: serviceDeps.organizationId }),
      ]);

      cache.bots = bots;
      cache.settings = settings;
      cache.loadedAt = Date.now();
    }

    return cache;
  }

  async function routeChoose(
    serviceDeps: RouteTypes.RouteServiceDeps,
    input: RouteTypes.RouteQueryPlanParams,
    candidates: Bot[],
    members: Bot[],
    leader: Bot | undefined,
    routing: RouteTypes.RouteSettings,
    alone: 'direct' | 'vision',
  ): Promise<RouteTypes.RoutePlan> {
    const mentioned = routeMentions(input.text, candidates);
    const quoted = candidates.filter((bot) => input.role === 'user' && bot.id === input.replyAuthorId);

    if (mentioned.length === 0 && quoted.length === 0 && input.role === 'user' && candidates.length === 1) {
      return { members, responders: routeRequired(candidates), route: { via: alone, picks: routePicks(candidates, () => null) } };
    }

    const decision = await serviceDeps.drivers[routing.driver].decide({
      message: input,
      members,
      candidates,
      mentioned,
      quoted,
      leader,
      judge: routing.judge,
    });

    return { members, ...decision };
  }

  async function routeDecide(
    serviceDeps: RouteTypes.RouteServiceDeps,
    input: RouteTypes.RouteQueryPlanParams,
    members: Bot[],
    leader: Bot | undefined,
    routing: RouteTypes.RouteSettings,
  ): Promise<RouteTypes.RoutePlan> {
    if (input.reactionAuthorId !== null) {
      const author = members.filter((bot) => bot.id === input.reactionAuthorId);

      return { members, responders: routeRequired(author), route: { via: 'reaction', picks: routePicks(author, () => null) } };
    }

    const others = members.filter((bot) => bot.id !== input.authorId);
    const seeing = input.images ? routeQuerySeeing(serviceDeps, { bots: members }) : null;
    const candidates = others.filter((bot) => !seeing || seeing.has(bot.id));

    if (candidates.length === 0) {
      return { members, responders: [], route: { via: 'none', picks: [] } };
    }

    const left = input.role === 'user' ? candidates.length : routeRepliesLeft(serviceDeps, input);

    const upgradable = routeUpgradable(serviceDeps, input);

    if (input.hop >= ROUTE.hops + ROUTE.buffer || (left <= 0 && upgradable.size === 0)) {
      return { members, responders: [], route: { via: 'budget', picks: [] } };
    }

    const lead = seeing && leader && !seeing.has(leader.id) ? undefined : leader;
    const plan = await routeChoose(serviceDeps, input, candidates, members, lead, routing, others.length > 1 ? 'vision' : 'direct');
    const strongest = plan.responders.filter((responder) => !upgradable.has(responder.bot.id)).slice(0, Math.max(left, 0));
    const kept = plan.responders.flatMap((responder, index) => (upgradable.has(responder.bot.id) || strongest.includes(responder) ? [index] : []));

    if (kept.length === 0 && left <= 0) {
      return { members, responders: [], route: { via: 'budget', picks: [] } };
    }

    return {
      ...plan,
      responders: kept.flatMap((index) => plan.responders.slice(index, index + 1)),
      route: { ...plan.route, picks: kept.flatMap((index) => plan.route.picks.slice(index, index + 1)) },
    };
  }

  const memberIds = new Set(deps.database.all(deps.database.db
    .selectFrom('member')
    .select('botId')
    .where('roomId', '=', params.roomId)).map((member) => member.botId));

  const room = deps.database.all(deps.database.db
    .selectFrom('room')
    .select(['leaderBotId', 'driver'])
    .where('id', '=', params.roomId)).at(0);

  const { bots, settings } = await routeLoad(deps, memberIds);
  const members = bots.filter((bot) => memberIds.has(bot.id));
  const leader = members.find((bot) => bot.id === room?.leaderBotId);
  const plan = await routeDecide(deps, params, members, leader, { ...settings.routing, driver: room?.driver ?? settings.routing.driver });
  const absent = routeHandleMentions(params.text, bots.filter((bot) => !memberIds.has(bot.id)));

  if (absent.length > 0) {
    plan.route.absent = routePicks(absent, () => null);
  }

  return plan;
}
