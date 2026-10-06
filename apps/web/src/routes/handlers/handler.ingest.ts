import { createFileRoute } from '@tanstack/react-router';
import type { JsonValue } from '@orbs/server/server';

const MAX_BODY_BYTES = 64_000;
const NO_STORE = { 'Cache-Control': 'no-store' };

export const Route = createFileRoute('/t/ingest')({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const [{ log }, { jsonObject, jsonString, jsonValue, securityExtractClientIp, securityReadRequestText }] = await Promise.all([
          import('@orbs/logger/server'),
          import('@orbs/server/server'),
        ]);

        const origin = request.headers.get('origin') ?? request.headers.get('referer');
        const appOrigin = new URL(request.url).origin;

        if (!origin || (origin !== appOrigin && !origin.startsWith(`${appOrigin}/`))) {
          return new Response(null, { status: 403, headers: NO_STORE });
        }

        const { success } = await context.services.rateLimiters.ingest.limit(securityExtractClientIp(request.headers));

        if (!success) {
          return new Response(null, { status: 429, headers: NO_STORE });
        }

        const body = await securityReadRequestText(request, { maxBytes: MAX_BODY_BYTES });

        if (!body.ok) {
          return new Response(null, { status: body.status, headers: NO_STORE });
        }

        let payload: JsonValue;

        try {
          payload = jsonValue.parse(JSON.parse(body.text));
        } catch {
          return new Response(null, { status: 400, headers: NO_STORE });
        }

        const items: JsonValue[] = Array.isArray(payload) ? payload : [payload];

        for (const item of items) {
          const raw = jsonObject.safeParse(item);

          if (!raw.success) {
            continue;
          }

          const nested = jsonObject.safeParse(raw.data.event);
          const event = nested.success ? nested.data : raw.data;
          const message = jsonString.safeParse(event.message).data ?? 'Client log';
          const level = jsonString.safeParse(event.level).data;
          const entry = { ...event, tag: 'client', message };

          if (level === 'error') {
            log.error(entry);
          } else if (level === 'warn') {
            log.warn(entry);
          } else {
            log.info(entry);
          }
        }

        return new Response(null, { status: 204, headers: NO_STORE });
      },
    },
  },
});
