import { authedRouter } from './rpc.procedures';

export const computers = {
  status: authedRouter.computers.status.handler(async ({ context, input }) => context.computers.queries.status(input)),
  start: authedRouter.computers.start.handler(async ({ context, input }) => context.computers.actions.start(input)),
  sleep: authedRouter.computers.sleep.handler(async ({ context, input }) => context.computers.actions.sleep(input)),
  shutdown: authedRouter.computers.shutdown.handler(async ({ context, input }) => context.computers.actions.shutdown(input)),
  touch: authedRouter.computers.touch.handler(async ({ context, input }) => context.computers.actions.touch(input)),
  release: authedRouter.computers.release.handler(async ({ context, input }) => context.computers.actions.release({ ...input, deviceId: context.device.id })),
  thumbnail: authedRouter.computers.thumbnail.handler(async ({ context, input }) => context.computers.actions.thumbnail(input)),
  viewer: authedRouter.computers.viewer.handler(async ({ context, input }) => context.computers.actions.viewer({ ...input, device: context.device })),
};
