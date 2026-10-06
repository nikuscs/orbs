import { memoryCaptureControlInput, memoryCaptureStatusInput } from '#/types/memory-capture.types';
import { memoryStateExportInput, memoryStateMutation } from '#/types/memory-state.types';
import { memoryListInput, memoryWipeInput } from '#/types/memory.types';
import { baseRouter } from './rpc.middlewares';
import { authedProcedure } from './rpc.procedures';

const memory = baseRouter.router({
  wipe: authedProcedure.input(memoryWipeInput).handler(async ({ context, input }) =>
    context.services.tenant.actions.memoryWipe({ ...input, organizationId: context.auth.organization.id })),
  status: authedProcedure
    .input(memoryCaptureStatusInput)
    .handler(async ({ context, input }) =>
      context.services.tenant.queries.memoryStatus({ ...input, organizationId: context.auth.organization.id }),
    ),
  control: authedProcedure
    .input(memoryCaptureControlInput)
    .handler(async ({ context, input }) =>
      context.services.tenant.actions.memoryControl({ ...input, organizationId: context.auth.organization.id }),
    ),
  list: authedProcedure
    .input(memoryListInput)
    .handler(async ({ context, input }) =>
      context.services.tenant.queries.memoryList({ ...input, organizationId: context.auth.organization.id }),
    ),
  export: authedProcedure
    .input(memoryStateExportInput)
    .handler(async ({ context, input }) =>
      context.services.tenant.queries.memoryExport({ ...input, organizationId: context.auth.organization.id }),
    ),
  mutate: authedProcedure.input(memoryStateMutation).handler(async ({ context, input }) =>
    context.services.tenant.actions.memoryMutate({
      mutation: input,
      actorId: context.auth.user.id,
      organizationId: context.auth.organization.id,
    }),
  ),
});

export default memory;
