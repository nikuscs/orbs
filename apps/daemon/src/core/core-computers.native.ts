import { botGet } from '@repo/contracts/universal';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import type * as CoreTypes from '../types/core.types';

const ROUTE = /^\/computers\/(?<botId>[^/]+)(?<rest>\/.*)?$/u;
const ALLOWED = /^\/(?:viewer(?:\/.*)?|cua\.env\.v1\.[\w.]+\/\w+|media|files(?:\/.*)?)$/u;
const DOT_SEGMENT = /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/iu;
const STRIPPED_REQUEST = ['host', 'cookie', 'authorization', 'accept-encoding', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions', 'sec-websocket-protocol', 'upgrade', 'connection'];
const STRIPPED_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive'];
const SANDBOX = 'sandbox allow-scripts allow-forms allow-pointer-lock allow-popups; frame-ancestors \'self\'';
const CORS_METHODS = 'GET, POST, OPTIONS';
const CORS_REQUEST_HEADERS = ['content-type', 'x-grpc-web', 'x-user-agent', 'x-cua-env-authorization', 'grpc-timeout'].join(', ');
const CORS_EXPOSED_HEADERS = ['grpc-status', 'grpc-message', 'grpc-status-details-bin'].join(', ');
const CORS_MAX_AGE_SECONDS = '600';
const CONNECT_TIMEOUT_MS = 10_000;
const UPSTREAM_BUFFER_LIMIT = 4 * 1024 * 1024;
const NORMAL_CLOSE = 1000;
const GOING_AWAY = 1001;

export function coreComputersHandler(endpoint: CoreTypes.CoreComputerEndpoint): CoreTypes.CoreHandler<Request> {
  return async (request, server) => {
    const url = new URL(request.url);
    const route = ROUTE.exec(url.pathname)?.groups;
    const botId = botGet.safeParse({ botId: route?.botId });
    const rest = route?.rest ?? '';

    return match({ isRoute: botId.success && !DOT_SEGMENT.test(rest) && ALLOWED.test(rest), method: request.method })
      .with({ isRoute: false }, () => Promise.resolve(coreComputersHeaders(new Response(null, { status: 404 }))))
      .with({ method: 'OPTIONS' }, () => Promise.resolve(coreComputersPreflight()))
      .otherwise(() => coreComputersProxy(request, server, {
        botId: botId.data?.botId ?? '',
        rest,
        search: url.search,
        endpoint,
      }));
  };
}

async function coreComputersProxy(
  request: Request,
  server: CoreTypes.CoreServer,
  { botId, rest, search, endpoint }: CoreTypes.CoreComputerProxyParams,
): Promise<Response | undefined> {
  const base = await endpoint({ botId }).catch((error: unknown) => {
    match(error)
      .with({ code: 'NOT_FOUND' }, () => log.debug({
        tag: 'computer-proxy',
        message: 'The computer endpoint is unknown',
        botId,
      }))
      .otherwise(() => log.error({
        tag: 'computer-proxy',
        message: 'Cannot resolve the computer endpoint',
        error,
      }));

    return null;
  });

  return match(base)
    .with(P.nullish, () => coreComputersHeaders(new Response(null, { status: 503 })))
    .with(P.string, (origin) => {
      const target = new URL(rest + search, origin);

      return match(request.headers.get('upgrade')?.toLowerCase())
        .with('websocket', () => coreComputersUpgrade(request, server, target))
        .otherwise(() => coreComputersForward(request, target));
    })
    .exhaustive();
}

function coreComputersPreflight(): Response {
  const response = new Response(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
  response.headers.set('Access-Control-Allow-Headers', CORS_REQUEST_HEADERS);
  response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE_SECONDS);

  return coreComputersHeaders(response);
}

function coreComputersHeaders(response: Response): Response {
  response.headers.delete('content-security-policy');
  response.headers.delete('content-security-policy-report-only');
  response.headers.set('Content-Security-Policy', SANDBOX);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Expose-Headers', CORS_EXPOSED_HEADERS);
  response.headers.set('Cache-Control', 'no-store');

  return response;
}

async function coreComputersForward(request: Request, target: URL): Promise<Response> {
  const headers = new Headers(request.headers);

  for (const name of STRIPPED_REQUEST) {
    headers.delete(name);
  }

  headers.set('accept-encoding', 'identity');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
    signal: request.signal,
  }).catch((error: unknown) => {
    log.warn({
      tag: 'computer-proxy',
      message: 'Computer request failed',
      error,
    });

    return null;
  });

  return match(upstream)
    .with(P.nullish, () => coreComputersHeaders(new Response(null, { status: 502 })))
    .with(P.nonNullable, (received) => {
      const responseHeaders = new Headers(received.headers);

      for (const name of STRIPPED_RESPONSE) {
        responseHeaders.delete(name);
      }

      return coreComputersHeaders(new Response(received.body, { status: received.status, headers: responseHeaders }));
    })
    .exhaustive();
}

async function coreComputersUpgrade(request: Request, server: CoreTypes.CoreServer, target: URL): Promise<Response | undefined> {
  const requested = (request.headers.get('sec-websocket-protocol') ?? '').split(',').map((protocol) => protocol.trim()).filter(Boolean);
  const upstreamUrl = new URL(target);
  upstreamUrl.protocol = 'ws:';

  const state: CoreTypes.CoreSocketComputer = {
    kind: 'computer',
    upstream: new WebSocket(upstreamUrl, requested),
    pending: [],
    isOpen: false,
  };

  state.upstream.binaryType = 'arraybuffer';

  const opened = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), CONNECT_TIMEOUT_MS);

    const settle = (value: boolean): void => {
      clearTimeout(timer);
      resolve(value);
    };

    state.upstream.addEventListener('open', () => settle(true), { once: true });
    state.upstream.addEventListener('error', () => settle(false), { once: true });
    state.upstream.addEventListener('close', () => settle(false), { once: true });
  });

  return match(opened)
    .with(false, () => {
      state.upstream.close();

      return new Response(null, { status: 502 });
    })
    .with(true, () => {
      state.upstream.addEventListener('message', (event: MessageEvent<string | ArrayBuffer>) => {
        match(state.isOpen)
          .with(false, () => state.pending.push(event.data))
          .with(true, () => undefined)
          .exhaustive();
      });

      const headers = match(state.upstream.protocol)
        .with(P.string.minLength(1), (protocol) => ({ 'sec-websocket-protocol': protocol }))
        .otherwise(() => undefined);

      return match(server.upgrade(request, { data: state satisfies CoreTypes.CoreSocket, headers }))
        .with(true, () => undefined)
        .with(false, () => {
          state.upstream.close();

          return new Response(null, { status: 426 });
        })
        .exhaustive();
    })
    .exhaustive();
}

export function coreComputersSocketOpen(socket: CoreTypes.CoreSocketHandle, state: CoreTypes.CoreSocketComputer): void {
  const { upstream, pending } = state;

  const forward = (data: string | ArrayBuffer): void => {
    match(socket.send(data))
      .with(0, () => socket.close(GOING_AWAY))
      .otherwise(() => undefined);
  };

  upstream.addEventListener('message', (event: MessageEvent<string | ArrayBuffer>) => forward(event.data));
  upstream.addEventListener('close', (event) => socket.close(coreComputersCloseCode(event.code)));
  upstream.addEventListener('error', () => socket.close(GOING_AWAY));

  state.isOpen = true;

  for (const message of pending.splice(0)) {
    forward(message);
  }

  match(upstream.readyState)
    .with(WebSocket.OPEN, () => undefined)
    .otherwise(() => socket.close(GOING_AWAY));
}

export function coreComputersSocketMessage(socket: CoreTypes.CoreSocketHandle, state: CoreTypes.CoreSocketComputer, message: string | Buffer): void {
  const { upstream } = state;

  match(upstream.readyState === WebSocket.OPEN && upstream.bufferedAmount <= UPSTREAM_BUFFER_LIMIT)
    .with(false, () => socket.close(GOING_AWAY))
    .with(true, () => upstream.send(match(message).with(P.string, (text) => text).otherwise((bytes) => new Uint8Array(bytes))))
    .exhaustive();
}

export function coreComputersSocketClose({ upstream }: CoreTypes.CoreSocketComputer): void {
  match(upstream.readyState)
    .with(WebSocket.OPEN, WebSocket.CONNECTING, () => upstream.close(NORMAL_CLOSE))
    .otherwise(() => undefined);
}

function coreComputersCloseCode(code: number): number {
  return match(code >= NORMAL_CLOSE && code < 5000 && ![1004, 1005, 1006, 1015].includes(code))
    .with(true, () => code)
    .with(false, () => NORMAL_CLOSE)
    .exhaustive();
}
