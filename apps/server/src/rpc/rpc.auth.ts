import { baseRouter } from './rpc.middlewares';
import { guestProcedure } from './rpc.procedures';

const auth = baseRouter.router({
  session: guestProcedure
    .handler(async ({ context }) => context.auth),
});

export default auth;
