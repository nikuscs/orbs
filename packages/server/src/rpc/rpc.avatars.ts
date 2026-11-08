import { authedRouter } from './rpc.procedures';

export const avatars = {
  generator: authedRouter.avatars.generator.handler(async ({ context }) => context.avatars.queries.generator()),
  generate: authedRouter.avatars.generate.handler(async ({ context, input }) => context.avatars.actions.generate(input)),
  upload: authedRouter.avatars.upload.handler(async ({ context, input }) => context.avatars.actions.upload(input)),
};
