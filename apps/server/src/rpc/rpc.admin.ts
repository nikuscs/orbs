import { authAdminBanInput, authAdminUnbanInput, authAdminUsersInput } from '#/types/auth.types';
import { baseRouter } from './rpc.middlewares';
import { adminProcedure } from './rpc.procedures';

const admin = baseRouter.router({
  users: baseRouter.router({
    list: adminProcedure
      .input(authAdminUsersInput)
      .handler(async ({ context, input }) => context.services.auth.queries.users({ headers: context.headers, ...input })),
    ban: adminProcedure
      .input(authAdminBanInput)
      .handler(async ({ context, input }) => context.services.auth.actions.banUser({ headers: context.headers, ...input })),
    unban: adminProcedure
      .input(authAdminUnbanInput)
      .handler(async ({ context, input }) => context.services.auth.actions.unbanUser({ headers: context.headers, userId: input.userId })),
  }),
});

export default admin;
