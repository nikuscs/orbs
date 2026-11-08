import { authedRouter } from './rpc.procedures';

export const avatars = {
  settings: authedRouter.avatars.settings.handler(async ({ context }) => context.avatars.actions.probe()),
  configure: authedRouter.avatars.configure.handler(async ({ context, input }) => context.avatars.actions.configure(input)),
  generate: authedRouter.avatars.generate.handler(async ({ context, input }) => context.avatars.actions.generate(input)),
  upload: authedRouter.avatars.upload.handler(async ({ context, input }) => context.avatars.actions.upload(input)),
};
