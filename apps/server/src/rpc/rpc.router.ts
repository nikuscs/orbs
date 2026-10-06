import { baseRouter } from './rpc.middlewares';

export const router = baseRouter.router({
  memory: baseRouter.lazy(() => import('./rpc.memory')),
  admin: baseRouter.lazy(() => import('./rpc.admin')),
  apiKeys: baseRouter.lazy(() => import('./rpc.api-keys')),
  auth: baseRouter.lazy(() => import('./rpc.auth')),
  bots: baseRouter.lazy(() => import('./rpc.bots')),
  organization: baseRouter.lazy(() => import('./rpc.organization')),
  rooms: baseRouter.lazy(() => import('./rpc.rooms')),
  system: baseRouter.lazy(() => import('./rpc.system')),
});
