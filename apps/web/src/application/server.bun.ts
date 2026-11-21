import { env } from '@repo/env/server';
import { initNativeLogger, log } from '@repo/logger/server';
import { join, posix, sep } from 'node:path';
import { connectionFileHeaders, connectionHasAddresses, connectionTarget } from '@/services/connection/connection.utils';
import type { RpcProxySocket } from '@/types/rpc.types';
import type { ServerWebSocket, WebSocketOptions } from 'bun';

const DIST_DIRECTORY = join(import.meta.dir, '..', '..', 'dist');
const CLIENT_DIRECTORY = join(DIST_DIRECTORY, 'client');
const SERVER_ENTRY_POINT = join(DIST_DIRECTORY, 'server', 'server.tanstack.js');
const SCAN_PATTERN = '**/*.{js,css,html,json,txt,xml,ico,svg,png,jpg,jpeg,gif,webp,riv,woff,woff2,ttf,eot,mp4,webm,mov,zip,webmanifest}';
const ON_DEMAND_EXTENSIONS = ['.riv', '.wasm', '.zip'];
const DOWNLOAD_EXTENSIONS = ['.zip', '.tar', '.gz'];
const PRELOAD_MAX_BYTES = 5 * 1024 * 1024;
const LOOPBACK_HOSTS = ['127.0.0.1', '::1', 'localhost'];
const LOCAL_DAEMON = `http://127.0.0.1:${env.DAEMON_PORT}`;

try {
  initNativeLogger(env.LOG_LEVEL);

  const app: { default: { fetch: (request: Request) => Promise<Response> } } = await import(SERVER_ENTRY_POINT);
  const assets: Record<string, (request: Request) => Response> = {};
  let preloadedBytes = 0;
  let onDemandFiles = 0;

  for await (const relativePath of new Bun.Glob(SCAN_PATTERN).scan({ cwd: CLIENT_DIRECTORY })) {
    const path = join(CLIENT_DIRECTORY, relativePath);
    const route = `/${relativePath.split(sep).join(posix.sep)}`;
    const lowerPath = relativePath.toLowerCase();
    const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath;
    const file = Bun.file(path);

    if (lowerPath.endsWith('.map') || file.size === 0) {
      continue;
    }

    const preload = file.size <= PRELOAD_MAX_BYTES && !ON_DEMAND_EXTENSIONS.some((extension) => lowerPath.endsWith(extension));

    if (!preload) {
      const download = DOWNLOAD_EXTENSIONS.some((extension) => lowerPath.endsWith(extension));

      onDemandFiles += 1;
      assets[route] = () => {
        const headers = new Headers({ 'Content-Type': file.type, 'Cache-Control': 'public, max-age=3600' });

        if (download) {
          headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        return new Response(Bun.file(path), { headers });
      };
      continue;
    }

    const cacheControl = route.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
    const raw = new Uint8Array(await file.arrayBuffer());
    const etag = `W/"${Bun.hash(raw).toString(16)}-${String(raw.byteLength)}"`;

    preloadedBytes += raw.byteLength;
    assets[route] = (request) => {
      const headers = new Headers({ 'Content-Type': file.type, 'Cache-Control': cacheControl });

      if (request.headers.get('if-none-match') === etag) {
        return new Response(null, { status: 304, headers: { ETag: etag } });
      }

      headers.set('ETag', etag);
      headers.set('Content-Length', String(raw.byteLength));

      return new Response(new Uint8Array(raw), { headers });
    };
  }

  const server = Bun.serve({
    hostname: env.WEB_HOST,
    port: env.WEB_PORT,
    routes: assets,
    fetch: async (request, bun) => {
      const { pathname, search } = new URL(request.url);

      if (pathname === '/rpc' || pathname === '/health' || pathname === '/mcp/callback' || pathname.startsWith('/rpc/') || pathname.startsWith('/files/') || pathname.startsWith('/avatars/') || pathname.startsWith('/computers/')) {
        const cookies = request.headers.get('cookie') ?? '';
        const picked = connectionHasAddresses(cookies) ? await connectionTarget(cookies) : { url: LOCAL_DAEMON, isMismatch: false };
        const daemon = picked.url;

        if (!daemon) {
          return picked.isMismatch
            ? new Response('This address belongs to a different server', { status: 409 })
            : new Response('No server address answered', { status: 502 });
        }

        const target = new URL(pathname + search, daemon);
        const headers = new Headers(request.headers);
        headers.delete('host');

        if (pathname.startsWith('/files/') && !headers.has('authorization')) {
          Object.entries(connectionFileHeaders(cookies)).forEach(([name, value]) => headers.set(name, value));
        }

        if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
          target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
          const protocols = (request.headers.get('sec-websocket-protocol') ?? '').split(',').map((protocol) => protocol.trim()).filter(Boolean);

          const data: RpcProxySocket = {
            target: target.href,
            origin: request.headers.get('origin'),
            protocols,
            pending: [],
          };

          return bun.upgrade(request, { data, headers: protocols.length > 0 ? { 'sec-websocket-protocol': protocols[0] } : undefined }) ? undefined : new Response(null, { status: 426 });
        }

        return fetch(target, {
          method: request.method,
          headers,
          body: request.body,
          redirect: 'manual',
        });
      }

      if (pathname.toLowerCase().endsWith('.map')) {
        return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }

      const response = await app.default.fetch(request);
      const headers = new Headers(response.headers);
      const contentType = (headers.get('content-type') ?? '').split(';')[0].trim();

      if (contentType === 'text/html' && !headers.has('Cache-Control')) {
        headers.set('Cache-Control', 'no-cache');
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
    websocket: {
      open: (socket: ServerWebSocket<RpcProxySocket>) => {
        const options: WebSocketOptions = { headers: socket.data.origin ? { origin: socket.data.origin } : {} };
        const upstream: WebSocket = Reflect.construct(WebSocket, [socket.data.target, { ...options, protocols: socket.data.protocols }]);

        upstream.binaryType = 'arraybuffer';
        upstream.addEventListener('open', () => {
          for (const message of socket.data.pending.splice(0)) {
            upstream.send(message);
          }
        });
        upstream.addEventListener('message', (event) => socket.send(event.data));
        upstream.addEventListener('close', () => socket.close());
        socket.data.upstream = upstream;
      },
      message: (socket: ServerWebSocket<RpcProxySocket>, message) => {
        const payload = message instanceof Buffer ? Uint8Array.from(message) : message;

        if (socket.data.upstream?.readyState === WebSocket.OPEN) {
          socket.data.upstream.send(payload);
        } else {
          socket.data.pending.push(payload);
        }
      },
      close: (socket: ServerWebSocket<RpcProxySocket>) => socket.data.upstream?.close(),
    },
    error: (error) => {
      log.error({
        tag: 'native',
        message: 'Uncaught server error',
        error,
      });

      return new Response('Internal Server Error', { status: 500 });
    },
  });

  log.info({
    tag: 'native',
    message: 'Web app listening',
    url: server.url.href,
    preloadedFiles: Object.keys(assets).length - onDemandFiles,
    preloadedBytes,
    onDemandFiles,
  });

  if (!LOOPBACK_HOSTS.includes(env.WEB_HOST)) {
    log.warn({
      tag: 'native',
      message: 'The web app is reachable from your network. Set WEB_HOST=127.0.0.1 to keep it local.',
      host: env.WEB_HOST,
    });
  }

  let stopping: Promise<void> | null = null;

  function serverStop(): void {
    stopping ??= (async () => {
      setTimeout(() => process.exit(1), 10_000).unref();

      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        log.error({
          tag: 'native',
          message: 'Web app shutdown failed',
          error,
        });
        process.exit(1);
      }
    })();
  }

  process.on('SIGINT', serverStop);
  process.on('SIGTERM', serverStop);
} catch (error) {
  log.error({
    tag: 'native',
    message: 'Web app failed to start',
    error,
  });
  process.exit(1);
}
