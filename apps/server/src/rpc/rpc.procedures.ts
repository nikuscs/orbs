import { Errors } from '@orbs/errors/universal';
import { AUTH } from '#services/auth/auth.constants';
import { baseRouter, middlewareAuthed, middlewareGuest, middlewareRateLimit } from './rpc.middlewares';

const publicProcedure = baseRouter;

export const guestProcedure = publicProcedure
  .use(middlewareRateLimit)
  .use(middlewareGuest);

export const authedProcedure = publicProcedure
  .use(middlewareAuthed);

export const adminProcedure = authedProcedure
  .use(({ context, next }) => {
    if (context.auth.user.role !== AUTH.adminRole) {
      throw new Errors.FORBIDDEN();
    }

    return next();
  });
