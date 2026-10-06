import { initNativeLogger, log } from '@orbs/logger/server';
import { join, posix, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { TENANT } from '@orbs/server/client';
import type { ServerNativeModule } from '@/types/server.types';

function serverEnvList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const NATIVE_DIRECTORY = join(import.meta.dir, '..', '..', 'dist', 'native');
const CLIENT_DIRECTORY = join(NATIVE_DIRECTORY, 'client');
const SERVER_ENTRY_POINT = join(NATIVE_DIRECTORY, 'server', 'server.native.js');
const DEFAULT_SCAN_PATTERN = '**/*.{js,css,html,json,txt,xml,ico,svg,png,jpg,jpeg,gif,webp,riv,woff,woff2,ttf,eot,mp4,webm,mov,zip,webmanifest}';
const ON_DEMAND_EXTENSIONS = ['.riv', '.wasm', '.zip'];
const DOWNLOAD_EXTENSIONS = ['.zip', '.tar', '.gz'];
const DEFAULT_PORT = '47101';
const LOOPBACK_HOSTS = ['127.0.0.1', '::1', 'localhost'];

function serverCompressible(gzipTypes: string[], mimeType: string): boolean {
  return gzipTypes.some((type) => (type.endsWith('/') ? mimeType.startsWith(type) : mimeType === type));
}

try {
  initNativeLogger();

  const { values } = parseArgs({ options: { port: { type: 'string', default: DEFAULT_PORT } } });
  const port = Number(values.port);
  const app: ServerNativeModule = await import(SERVER_ENTRY_POINT);
  const host = await app.makeNativeHost({ port });
  const { env } = host;
  const includePatterns = serverEnvList(env.ASSET_PRELOAD_INCLUDE_PATTERNS);
  const excludeGlobs = serverEnvList(env.ASSET_PRELOAD_EXCLUDE_PATTERNS).map((pattern) => new Bun.Glob(pattern));
  const gzipTypes = serverEnvList(env.ASSET_PRELOAD_GZIP_MIME_TYPES);
  const includeGlobs = includePatterns.map((pattern) => new Bun.Glob(pattern));
  const scanPattern = includePatterns.length > 1 ? `{${includePatterns.join(',')}}` : (includePatterns[0] ?? DEFAULT_SCAN_PATTERN);
  const assets: Record<string, (request: Request) => Response> = {};
  let preloadedBytes = 0;
  let onDemandFiles = 0;

  for await (const relativePath of new Bun.Glob(scanPattern).scan({ cwd: CLIENT_DIRECTORY })) {
    const path = join(CLIENT_DIRECTORY, relativePath);
    const route = `/${relativePath.split(sep).join(posix.sep)}`;
    const lowerPath = relativePath.toLowerCase();
    const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath;
    const file = Bun.file(path);

    if (lowerPath.endsWith('.map') || file.size === 0) {
      continue;
    }

    const preload = (includeGlobs.length === 0 || includeGlobs.some((glob) => glob.match(fileName)))
      && !excludeGlobs.some((glob) => glob.match(fileName))
      && file.size <= env.ASSET_PRELOAD_MAX_SIZE
      && !ON_DEMAND_EXTENSIONS.some((extension) => lowerPath.endsWith(extension));

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
    const compress = env.ASSET_PRELOAD_ENABLE_GZIP && raw.byteLength >= env.ASSET_PRELOAD_GZIP_MIN_SIZE && serverCompressible(gzipTypes, file.type);
    const gzip = compress ? Bun.gzipSync(raw) : undefined;
    const etag = env.ASSET_PRELOAD_ENABLE_ETAG ? `W/"${Bun.hash(raw).toString(16)}-${String(raw.byteLength)}"` : undefined;

    preloadedBytes += raw.byteLength;
    assets[route] = (request) => {
      const headers = new Headers({ 'Content-Type': file.type, 'Cache-Control': cacheControl });

      if (etag) {
        if (request.headers.get('if-none-match') === etag) {
          return new Response(null, { status: 304, headers: { ETag: etag } });
        }

        headers.set('ETag', etag);
      }

      if (gzip && request.headers.get('accept-encoding')?.includes('gzip')) {
        headers.set('Content-Encoding', 'gzip');
        headers.set('Vary', 'Accept-Encoding');
        headers.set('Content-Length', String(gzip.byteLength));

        return new Response(new Uint8Array(gzip), { headers });
      }

      headers.set('Content-Length', String(raw.byteLength));

      return new Response(new Uint8Array(raw), { headers });
    };
  }

  const server = Bun.serve({
    hostname: env.HOST,
    port,
    routes: {
      '/api/health': () => Response.json({ status: 'ok' }),
      ...assets,
    },
    fetch: async (request, bunServer) => {
      const pathname = new URL(request.url).pathname;

      if (pathname === TENANT.browserSocketPath || pathname === TENANT.daemonSocketPath) {
        return host.socketUpgrade(request, bunServer);
      }

      if (pathname.startsWith(TENANT.filePath)) {
        return host.services().tenant.queries.file({ request });
      }

      if (pathname.toLowerCase().endsWith('.map')) {
        return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }

      const response = await app.serverHandler(request, { request: { services: host.services() } });
      const headers = new Headers(response.headers);
      const contentType = (headers.get('content-type') ?? '').split(';')[0].trim();

      if (contentType === 'text/html') {
        headers.set('Cache-Control', 'no-cache');
      }

      const gzip = env.ASSET_PRELOAD_ENABLE_GZIP
        && (request.headers.get('accept-encoding') ?? '').includes('gzip')
        && !headers.has('content-encoding')
        && contentType !== 'text/event-stream'
        && serverCompressible(gzipTypes, contentType);

      if (!gzip || !response.body) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      headers.set('Content-Encoding', 'gzip');
      headers.set('Vary', 'Accept-Encoding');
      headers.delete('Content-Length');

      return new Response(response.body.pipeThrough(new CompressionStream('gzip')), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
    websocket: host.websocket,
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
    message: 'Orbs listening',
    url: server.url.href,
    preloadedFiles: Object.keys(assets).length - onDemandFiles,
    preloadedBytes,
    onDemandFiles,
  });

  if (!LOOPBACK_HOSTS.includes(env.HOST)) {
    log.warn({
      tag: 'native',
      message: 'Orbs is reachable from your network and Tailscale. Set HOST=127.0.0.1 to keep it local, and add other origins to APP_TRUSTED_ORIGINS to sign in from them.',
      host: env.HOST,
    });
  }

  let stopping: Promise<void> | null = null;

  function serverStop(): void {
    stopping ??= (async () => {
      setTimeout(() => process.exit(1), 10_000).unref();

      try {
        const stopped = server.stop();

        await host.dispose();
        await stopped;
        process.exit(0);
      } catch (error) {
        log.error({
          tag: 'native',
          message: 'Orbs shutdown failed',
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
    message: 'Orbs failed to start',
    error,
  });
  process.exit(1);
}
