import { ROUTING_DRIVER_LABELS } from './routing.constants';
import type { RouteDriverName } from '@orbs/server/client';

export function routingDriverLabels() {
  return {
    jev: ROUTING_DRIVER_LABELS.jev(),
    roundtable: ROUTING_DRIVER_LABELS.roundtable(),
    judge: ROUTING_DRIVER_LABELS.judge(),
  } satisfies Record<RouteDriverName, string>;
}
