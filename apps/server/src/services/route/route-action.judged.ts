import type { RouteActionJudgedParams, RouteServiceDeps } from '#/types/route.types';

export function routeActionJudged(deps: RouteServiceDeps, params: RouteActionJudgedParams): void {
  const { requestId, ...answer } = params;

  deps.judgeRequests.get(requestId)?.(answer);
  deps.judgeRequests.delete(requestId);
}
