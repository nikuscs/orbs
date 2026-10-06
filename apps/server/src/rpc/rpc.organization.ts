import { organizationConfigureInput } from '#/types/organization.types';
import { baseRouter } from './rpc.middlewares';
import { authedProcedure } from './rpc.procedures';

const organization = baseRouter.router({
  settings: authedProcedure
    .handler(async ({ context }) => context.services.organization.queries.settings({
      organizationId: context.auth.organization.id,
    })),
  configure: authedProcedure
    .input(organizationConfigureInput)
    .handler(async ({ context, input }) => context.services.organization.actions.configure({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      settings: input,
    })),
});

export default organization;
