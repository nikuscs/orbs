import { routeActionDecideJev } from './route-action.decide-jev';
import { routeActionDecideJudge } from './route-action.decide-judge';
import { routeActionDecideRoundtable } from './route-action.decide-roundtable';
import type * as RouteTypes from '#/types/route.types';

export function makeRouteDriversService({ database, jev, sockets, requests }: RouteTypes.RouteDriversServiceDeps): RouteTypes.RouteDrivers {
  const jevDeps: RouteTypes.RouteDriverJevDeps = { database, jev };
  const roundtableDeps: RouteTypes.RouteDriverRoundtableDeps = { database };

  const jevDriver: RouteTypes.RouteDriver = {
    decide: (params) => routeActionDecideJev(jevDeps, params),
  };

  const judgeDeps: RouteTypes.RouteDriverJudgeDeps = { database, sockets, requests, fallback: jevDriver };

  return {
    jev: jevDriver,
    roundtable: {
      decide: (params) => Promise.resolve(routeActionDecideRoundtable(roundtableDeps, params)),
    },
    judge: {
      decide: (params) => routeActionDecideJudge(judgeDeps, params),
    },
  };
}
