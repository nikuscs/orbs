import { authedRouter } from './rpc.procedures';

export const skills = {
  discover: authedRouter.skills.discover.handler(async ({ context, input }) => context.bots.queries.skills(input)),
  shared: authedRouter.skills.shared.handler(async ({ context, input }) => context.bots.queries.sharedSkills(input)),
  local: authedRouter.skills.local.handler(async ({ context, input }) => context.bots.queries.localSkills(input)),
  settings: authedRouter.skills.settings.handler(async ({ context }) => context.skills.queries.settings()),
  configure: authedRouter.skills.configure.handler(async ({ context, input }) => context.skills.actions.configure(input)),
};
