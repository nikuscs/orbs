import { notificationQueryWatch } from './notification-query.watch';
import { notificationPendingItems } from './notification.utils';
import type { NotificationServiceDeps } from '../../types/notification.types';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export function makeNotificationService(deps: NotificationServiceDeps) {
  return {
    watch: (context: Context) => notificationQueryWatch(deps, context),
    queries: {
      pending: (graph: PiDurableTypes.TaskGraph, context: Context) => notificationPendingItems(deps, graph, context),
    },
  };
}

export type NotificationService = ReturnType<typeof makeNotificationService>;
