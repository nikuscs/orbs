import { botCreateInput, botDeleteInput, botModelsInput, botSkillsInput, botUpdateInput } from '#/types/bot.types';
import { baseRouter } from './rpc.middlewares';
import { authedProcedure } from './rpc.procedures';

const bots = baseRouter.router({
  delete: authedProcedure
    .input(botDeleteInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.deleteBot({ organizationId: context.auth.organization.id, ...input })),
  harnesses: authedProcedure
    .handler(async ({ context }) => context.services.tenant.queries.harnesses({ organizationId: context.auth.organization.id })),
  models: authedProcedure
    .input(botModelsInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.models({
      organizationId: context.auth.organization.id,
      harnessId: input.harnessId,
    })),
  skills: authedProcedure
    .input(botSkillsInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.skills({ organizationId: context.auth.organization.id, botId: input.botId })),
  list: authedProcedure
    .handler(async ({ context }) => context.services.bot.queries.list({ organizationId: context.auth.organization.id })),
  create: authedProcedure
    .input(botCreateInput)
    .handler(async ({ context, input }) => context.services.bot.actions.create({ organizationId: context.auth.organization.id, ...input })),
  update: authedProcedure
    .input(botUpdateInput)
    .handler(async ({ context, input }) => context.services.bot.actions.update({ organizationId: context.auth.organization.id, ...input })),
});

export default bots;
