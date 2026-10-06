import { baseRouter } from './rpc.middlewares';
import { guestProcedure } from './rpc.procedures';

const system = baseRouter.router({
  health: guestProcedure
    .handler(() => ({ checkedAt: new Date() })),
});

export default system;
