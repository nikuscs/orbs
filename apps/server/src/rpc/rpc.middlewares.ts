import { Errors, errorSchemas } from '@orbs/errors/universal';
import { ratelimit } from '@orpc/ratelimit';
import { os } from '@orpc/server';
import { securityExtractClientIp } from '#services/security/security.utils';
import type { RpcBaseContext } from '#/types/rpc.types';

export const baseRouter = os.$context<RpcBaseContext>().errors(errorSchemas);

export const middlewareRateLimit = ratelimit({
  limiter: ({ context }: { context: RpcBaseContext }) => context.services.rateLimiters.rpc,
  key: ({ context }: { context: RpcBaseContext }) => securityExtractClientIp(context.headers),
});

export const middlewareGuest = baseRouter.middleware(async ({ context, next }) => {
  const auth = await context.services.auth.queries.session({ headers: context.headers, onCookie: context.onCookie });

  return next({ context: { auth } });
});

export const middlewareAuthed = baseRouter.middleware(async ({ context, next }) => {
  const auth = await context.services.auth.queries.session({ headers: context.headers, onCookie: context.onCookie });

  if (!auth) {
    throw new Errors.UNAUTHORIZED();
  }

  if (auth.user.ban) {
    throw new Errors.USER_BANNED({ until: auth.user.ban.until });
  }

  return next({ context: { auth } });
});
