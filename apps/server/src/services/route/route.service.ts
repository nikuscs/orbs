import { routeActionInvalidate } from './route-action.invalidate';
import { routeActionJudged } from './route-action.judged';
import { routeQueryApproval } from './route-query.approval';
import { routeQueryBlind } from './route-query.blind';
import { routeQueryMemory } from './route-query.memory';
import { routeQueryPlan } from './route-query.plan';
import type * as RouteTypes from '#/types/route.types';

export function makeRouteService(deps: RouteTypes.RouteServiceDeps) {
  return {
    queries: {
      memory: (params: RouteTypes.RouteQueryMemoryParams) => routeQueryMemory(deps, params),
      plan: (params: RouteTypes.RouteQueryPlanParams) => routeQueryPlan(deps, params),
      approval: (params: RouteTypes.RouteQueryApprovalParams) => routeQueryApproval(deps, params),
      blind: (params: RouteTypes.RouteQueryBlindParams) => routeQueryBlind(deps, params),
    },
    actions: {
      invalidate: () => routeActionInvalidate(deps),
      judged: (params: RouteTypes.RouteActionJudgedParams) => routeActionJudged(deps, params),
    },
  };
}

export type RouteService = ReturnType<typeof makeRouteService>;
