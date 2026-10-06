import type { RouteServiceDeps } from '#/types/route.types';

export function routeActionInvalidate(deps: RouteServiceDeps): void {
  deps.cache.bots = [];
  deps.cache.loadedAt = 0;
}
