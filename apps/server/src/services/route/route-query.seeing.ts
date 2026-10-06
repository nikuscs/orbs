import { daemonHarness } from '#/types/daemon.types';
import type * as RouteTypes from '#/types/route.types';

export function routeQuerySeeing(deps: RouteTypes.RouteServiceDeps, params: RouteTypes.RouteQuerySeeingParams): Set<string> {
  const providers = deps.database.all(deps.database.db.selectFrom('harness').select('catalogue')).flatMap((row) => {
    const harness = daemonHarness.safeParse(JSON.parse(row.catalogue));

    return harness.success ? harness.data.providers : [];
  });

  const seeing = params.bots.filter((bot) => providers.some((provider) => provider.id === bot.modelProvider
    && provider.models.some((model) => model.id === bot.modelId && model.images)));

  return new Set(seeing.map((bot) => bot.id));
}
