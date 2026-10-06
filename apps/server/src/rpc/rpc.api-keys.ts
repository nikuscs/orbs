import { authApiKeyCreateInput, authApiKeyDeleteInput } from '#/types/auth.types';
import { baseRouter } from './rpc.middlewares';
import { authedProcedure } from './rpc.procedures';

const apiKeys = baseRouter.router({
  list: authedProcedure
    .handler(async ({ context }) => context.services.auth.queries.apiKeys({
      headers: context.headers,
      organizationId: context.auth.organization.id,
    })),
  create: authedProcedure
    .input(authApiKeyCreateInput)
    .handler(async ({ context, input }) => context.services.auth.actions.createApiKey({
      headers: context.headers,
      organizationId: context.auth.organization.id,
      name: input.name,
    })),
  delete: authedProcedure
    .input(authApiKeyDeleteInput)
    .handler(async ({ context, input }) => context.services.auth.actions.deleteApiKey({
      headers: context.headers,
      organizationId: context.auth.organization.id,
      keyId: input.keyId,
    })),
});

export default apiKeys;
