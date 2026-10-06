import { m } from '@orbs/i18n/client';
import type { RouteDriverName } from '@orbs/server/client';

export const ROUTING_DRIVER_LABELS = {
  jev: m.routing_driver_jev,
  roundtable: m.routing_driver_roundtable,
  judge: m.routing_driver_judge,
} satisfies Record<RouteDriverName, () => string>;
