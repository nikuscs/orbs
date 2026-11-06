/* eslint-disable max-lines -- the whole daemon host lives in this one file by design */
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { onError } from '@orpc/server';
import { RPCHandler as FetchRPCHandler } from '@orpc/server/fetch';
import { CORSPlugin, RequestHeadersPlugin, ResponseHeadersPlugin } from '@orpc/server/plugins';
import { RPCHandler as WebsocketRPCHandler } from '@orpc/server/websocket';
import { artifactGet, SERVER_PROTOCOL, serverOrigin } from '@repo/contracts/universal';
import { env } from '@repo/env/server';
import { Errors, errorStatusMap, isAppError } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { embedFile, embedPage } from '@repo/ui/native';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { chmod, lstat, mkdir, open, rm, unlink, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { match, P } from 'ts-pattern';
import { renderUnicodeCompact } from 'uqr';
import {
  makeAlarmService,
  makeComputerHostService,
  makeImageService,
  makeInstructionLoaderService,
  makeMcpAuthService,
  makeMcpClientService,
  makePluginLoaderService,
  makeProviderService,
  makeSkillLoaderService,
  makeStorageLockService,
  makeStorageService,
  runtimeEnvNative,
} from '@repo/runtime/native';
import { makeSecretBrokerService, makeSecretProxyService } from '@repo/secret-proxy/native';
import {
  credentialsKeyNative,
  makeAttachmentStorageService,
  makeAvatarImageService,
  makeBackupService,
  makeDatabaseService,
  makeLinkResolverService,
  makeMcpService,
  makeServerNetworkService,
  makeWorkspaceService,
  workspacePathsNative,
  workspacePathsRootNative,
} from '@repo/server/native';
import { coreHandler, makeCredentialsService, makeSecretService, makeServices, makeSettingsService, router } from '@repo/server/server';
import { coreComputersHandler, coreComputersSocketClose, coreComputersSocketMessage, coreComputersSocketOpen } from './core-computers.native';
import { coreFilesRange } from './core-files.native';
import type * as CoreTypes from '../types/core.types';
import type { RouterClient } from '@orpc/server';
import type { RPCHandlerOptions } from '@orpc/server/fetch';

const HELP = `Usage:
  orbs start [--detach]
  orbs pair [--url <origin>]
  orbs service register
  orbs service unregister
  orbs backup create <new-directory>
  orbs backup restore <backup-directory>

Without a command, the daemon starts in the foreground.
Service commands change startup at the next macOS login, not the running daemon.
Backup commands work on the data directory directly; stop the daemon first.
`;

const ENTRY = realpathSync(process.argv[1]);
const ROOT = workspacePathsRootNative(env.DATA_DIR);
const LOG = join(ROOT, 'data', 'daemon.log');
const SOCKET = join(ROOT, 'data', 'ipc', 'rpc.sock');
const STOP_SIGNALS = ['SIGINT', 'SIGTERM'] as const;
const OWNER_ONLY = 0o700;
const AVATAR_BOT = /^(?<id>[\da-f-]{36})\.png$/u;
const AVATAR_IMAGE = /^(?<id>[\da-f-]{36})\.webp$/u;

export async function coreNativeCommand(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      detach: { type: 'boolean' },
      url: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  await match({
    command: positionals,
    detach: values.detach,
    url: values.url,
    help: values.help,
  })
    .with({ help: true }, { command: ['help'] }, () => process.stdout.write(HELP))
    .with({ command: [], url: undefined }, { command: ['start'], url: undefined }, () => (values.detach ? coreNativeDetach() : coreNativeRun()))
    .with({ command: ['pair'], detach: undefined }, () => coreNativePair(values.url))
    .with({
      command: ['service', P.union('register', 'unregister')],
      detach: undefined,
      url: undefined,
    }, ({ command }) => coreNativeService(command[1]))
    .with({
      command: ['backup', P.union('create', 'restore'), P.string],
      detach: undefined,
      url: undefined,
    }, ({ command }) => coreNativeBackup(command[1], resolve(command[2])))
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: HELP });
    });
}

async function coreNativeRun(): Promise<void> {
  await using resources = new AsyncDisposableStack();

  const stopped = new Promise<void>((done) => {
    const stop = (): void => done();

    for (const signal of STOP_SIGNALS) {
      process.once(signal, stop);
    }

    resources.defer(() => {
      for (const signal of STOP_SIGNALS) {
        process.off(signal, stop);
      }
    });
  });

  const services = await coreNativeServices(resources);

  const network = coreNativeNetwork(services);
  resources.defer(() => network.stop(true));

  const local = await coreNativeLocal(services);
  resources.defer(() => local.stop(true));

  log.info({
    tag: 'daemon',
    message: 'Daemon started',
    host: env.DAEMON_HOST,
    port: network.port,
  });

  resources.defer(coreNativeFirstPairing(services));
  process.send?.('daemon:ready');

  await stopped;
  log.info({ tag: 'daemon', message: 'Daemon stopped' });
}

async function coreNativeServices(resources: AsyncDisposableStack): Promise<CoreTypes.CoreServices> {
  const paths = await workspacePathsNative(env.DATA_DIR);

  const lock = await makeStorageLockService({ path: paths.lock });
  resources.defer(() => lock.close());
  const alarm = makeAlarmService();
  resources.defer(() => alarm.close());

  const database = makeDatabaseService({ path: paths.database });
  resources.defer(() => database.close());
  await database.migrate();

  const providers = await makeProviderService();
  resources.defer(() => providers.close());
  const credentials = makeCredentialsService({ database, key: await credentialsKeyNative(paths.data) });
  const mcpAuth = makeMcpAuthService({ credentials, appName: env.APP_NAME });
  resources.defer(() => mcpAuth.close());
  const settings = makeSettingsService({ database });
  const secrets = makeSecretService({ credentials, settings });

  const secretsFolder = join(paths.data, 'secrets');
  const secretProxy = makeSecretProxyService({ source: secrets, folder: secretsFolder });
  resources.defer(() => secretProxy.actions.stop());

  const mcpClients = makeMcpClientService({ root: paths.root, auth: mcpAuth });
  resources.defer(() => mcpClients.close());

  const computers = makeComputerHostService({
    folder: join(paths.data, 'computers'),
    credentials,
    dockerHost: env.DOCKER_HOST,
  });

  const services = await makeServices({
    database,
    attachmentStorage: makeAttachmentStorageService({ root: paths.root }),
    avatarImages: makeAvatarImageService({ root: join(paths.data, 'avatars') }),
    credentials,
    secrets,
    settings,
    workspace: makeWorkspaceService({ root: paths.root }),
    skillLoader: makeSkillLoaderService({ root: paths.root }),
    instructionLoader: makeInstructionLoaderService({ root: paths.root }),
    pluginLoader: makePluginLoaderService({ root: paths.root }),
    mcp: makeMcpService({
      root: paths.root,
      settings,
      clients: mcpClients,
      credentials,
      secrets,
    }),
    mcpAuth,
    network: makeServerNetworkService({ host: env.DAEMON_HOST, port: env.DAEMON_PORT }),
    linkResolver: makeLinkResolverService(),
    appScheme: env.MOBILE_SCHEME,
    providers,
    runtime: {
      appName: env.APP_NAME,
      storage: makeStorageService({ root: paths.bots }),
      alarm,
      models: providers.models,
      env: runtimeEnvNative(paths.root),
      images: await makeImageService(),
      computers,
      secrets: makeSecretBrokerService({
        source: secrets,
        proxy: secretProxy,
        folder: secretsFolder,
        varlock: Bun.which('varlock'),
      }),
    },
  });

  resources.defer(() => computers.close());
  resources.defer(() => services.runtime.close());
  resources.defer(await services.notifications.actions.watch());

  return services;
}

function coreNativeRpc(services: CoreTypes.CoreServices, isLocal: boolean) {
  const plugins = [new RequestHeadersPlugin(), new ResponseHeadersPlugin()];
  const cors = new CORSPlugin({ origin: env.DAEMON_ALLOWED_ORIGINS });

  const interceptors: RPCHandlerOptions<object>['interceptors'] = [onError((error, { path }) => {
    const fields = { tag: 'rpc', message: 'Request failed', path: path.join('.') };

    if (isAppError(error) && !error.reportable) {
      log.warn({
        ...fields,
        code: error.code,
        reason: error.internal,
        data: error.data,
      });
      return;
    }

    log.error({ ...fields, error });
  })];

  return {
    context: { ...services, isLocal, peerAddress: null },
    http: new FetchRPCHandler(router, {
      plugins: [...plugins, cors],
      interceptors,
      errorStatusMap,
    }),
    files: new OpenAPIHandler({ download: router.attachments.download, poster: router.attachments.poster }, {
      plugins: [...plugins, cors],
      interceptors,
      errorStatusMap,
    }),
    websocket: new WebsocketRPCHandler(router, {
      plugins,
      interceptors,
      errorStatusMap,
    }),
  };
}

function coreNativeNetwork(services: CoreTypes.CoreServices) {
  const rpc = coreNativeRpc(services, false);
  const peer = (request: Request, server: CoreTypes.CoreServer) => server.requestIP(request)?.address ?? null;

  const handleRpc = coreNativeOrigin(services, async (request, server) => coreNativeReply(
    await rpc.http.handle(request, { prefix: '/rpc', context: { ...rpc.context, peerAddress: peer(request, server) } }),
    'no-store',
  ));

  const handleFiles = coreNativeOrigin(services, async (request, server) => coreFilesRange(coreNativeReply(
    await rpc.files.handle(request, { prefix: '/files', context: { ...rpc.context, peerAddress: peer(request, server) } }),
    'private, max-age=31536000, immutable',
  )));

  return Bun.serve({
    hostname: env.DAEMON_HOST,
    port: env.DAEMON_PORT,
    maxRequestBodySize: 12 * 1024 * 1024,
    routes: {
      '/rpc': {
        GET: coreNativeOrigin(services, (request, server) => (server.upgrade(request, { data: { kind: 'rpc' } satisfies CoreTypes.CoreSocket }) ? undefined : new Response(null, { status: 426 }))),
        POST: handleRpc,
        OPTIONS: handleRpc,
      },
      '/rpc/*': { POST: handleRpc, OPTIONS: handleRpc },
      '/files/*': { GET: handleFiles, OPTIONS: handleFiles },
      '/avatars/bots/:file': {
        GET: (request, server) => coreNativePublic(services, peer(request, server), async () => {
          const botId = AVATAR_BOT.exec(request.params.file)?.groups?.id;

          return botId
            ? new Response(new Uint8Array(await services.avatars.queries.bot({ botId })), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' } })
            : new Response(null, { status: 404 });
        }),
      },
      '/avatars/:file': {
        GET: (request, server) => coreNativePublic(services, peer(request, server), async () => {
          const imageId = AVATAR_IMAGE.exec(request.params.file)?.groups?.id;

          return imageId
            ? new Response(new Uint8Array(await services.avatars.queries.image({ imageId })), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } })
            : new Response(null, { status: 404 });
        }),
      },
      '/embed/artifacts/:botId/:conversationId/:artifactId': {
        GET: (request, server) => coreNativePublic(services, peer(request, server), async () => {
          await services.auth.queries.authenticate({ authorization: request.headers.get('authorization') });

          const { botId, conversationId, artifactId } = request.params;

          const target = artifactGet.safeParse({
            botId,
            conversationId: Number(conversationId),
            artifactId,
          });

          if (!target.success) {
            return new Response(null, { status: 404 });
          }

          const artifact = await services.artifacts.queries.get(target.data);
          const theme = new URL(request.url).searchParams.get('theme') === 'dark' ? 'dark' : 'light';

          return match(artifact.spec)
            .with({ html: P.string }, () => new Response(null, { status: 404 }))
            .otherwise(async (spec) => new Response(await embedPage({ artifact: { title: artifact.title, spec }, theme }), {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src https: data:",
                'Referrer-Policy': 'no-referrer',
              },
            }));
        }),
      },
      '/computers/:botId/*': coreNativeOrigin(services, coreComputersHandler(services.computers.queries.endpoint), { isOpaqueAllowed: true }),
      '/embed/*': { GET: async (request) => await embedFile(new URL(request.url).pathname) ?? new Response(null, { status: 404 }) },
    },
    fetch: (request) => coreHandler(request, services),
    websocket: {
      maxPayloadLength: 1024 * 1024,
      backpressureLimit: 4 * 1024 * 1024,
      closeOnBackpressureLimit: true,
      open(socket) {
        match(socket.data).with({ kind: 'computer' }, (state) => coreComputersSocketOpen(socket, state)).otherwise(() => undefined);
      },
      async message(socket, message) {
        await match(socket.data)
          .with({ kind: 'computer' }, (state) => coreComputersSocketMessage(socket, state, message))
          .otherwise(() => rpc.websocket.message(socket, message, { context: { ...rpc.context, peerAddress: socket.remoteAddress } }));
      },
      async close(socket) {
        await match(socket.data)
          .with({ kind: 'computer' }, (state) => coreComputersSocketClose(state))
          .otherwise(() => rpc.websocket.close(socket));
      },
    },
  });
}

async function coreNativeLocal(services: CoreTypes.CoreServices) {
  const directory = dirname(SOCKET);
  await mkdir(directory, { recursive: true, mode: OWNER_ONLY });
  await chmod(directory, OWNER_ONLY);

  const folder = await lstat(directory);

  if (!folder.isDirectory() || (folder.mode & 0o777) !== OWNER_ONLY || folder.uid !== process.getuid?.()) {
    throw new Errors.INTERNAL_ERROR({ internal: 'Local IPC directory must be an owner-only directory' });
  }

  const stale = await lstat(SOCKET).catch(() => null);

  if (stale && !stale.isSocket()) {
    throw new Errors.INTERNAL_ERROR({ internal: 'Local IPC path exists and is not a socket' });
  }

  if (stale) {
    await unlink(SOCKET);
  }

  const rpc = coreNativeRpc(services, true);

  const server = Bun.serve({
    unix: SOCKET,
    maxRequestBodySize: 16 * 1024,
    routes: {
      '/rpc/pairing/bootstrap': {
        POST: async (request) => (request.headers.has('origin')
          ? new Response(null, { status: 403 })
          : coreNativeReply(await rpc.http.handle(request, { prefix: '/rpc', context: rpc.context }), 'no-store')),
      },
    },
    fetch: (request) => new Response(null, { status: request.headers.has('origin') ? 403 : 404 }),
  });

  try {
    await chmod(SOCKET, 0o600);
  } catch (error) {
    await server.stop(true);
    throw error;
  }

  return server;
}

function coreNativeOrigin<T extends Request>(
  services: CoreTypes.CoreServices,
  handler: CoreTypes.CoreHandler<T>,
  options: CoreTypes.CoreOriginOptions = { isOpaqueAllowed: false },
): CoreTypes.CoreHandler<T> {
  return (request, server) => {
    const origin = request.headers.get('origin');
    const parsed = URL.parse(origin ?? '');
    const hostname = parsed?.hostname.replace(/^\[|\]$/gu, '') ?? '';

    const isAllowed = origin === null
      || (options.isOpaqueAllowed && origin === 'null')
      || env.DAEMON_ALLOWED_ORIGINS.includes(parsed?.origin ?? origin)
      || isIP(hostname) !== 0
      || hostname === 'localhost'
      || hostname.endsWith('.localhost');

    if (isAllowed) {
      return handler(request, server);
    }

    return services.server.queries.info().then(({ addresses }) => (addresses.some(({ url }) => url === parsed?.origin)
      ? handler(request, server)
      : new Response(null, { status: 403 })));
  };
}

function coreNativeReply(result: { matched: true; response: Response } | { matched: false }, cacheControl: string): Response {
  if (!result.matched) {
    return new Response(null, { status: 404 });
  }

  result.response.headers.set('Cache-Control', result.response.ok ? cacheControl : 'no-store');
  result.response.headers.set('X-Content-Type-Options', 'nosniff');

  return result.response;
}

async function coreNativePublic(services: CoreTypes.CoreServices, peer: string | null, respond: () => Promise<Response>): Promise<Response> {
  try {
    await services.limits.throttle({ kind: 'public', peer });

    const response = await respond();
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  } catch (error) {
    const status = isAppError(error) ? errorStatusMap[error.code] : undefined;

    if (status === undefined) {
      throw error;
    }

    return new Response(null, { status });
  }
}

function coreNativeFirstPairing(services: CoreTypes.CoreServices): () => void {
  const serverUrl = new URL(env.WEB_PUBLIC_URL).origin;
  let timer: Timer | undefined;

  async function issue(): Promise<void> {
    const devices = await services.auth.queries.devices();

    if (devices.length > 0) {
      process.stdout.write(`\n${devices.length} paired device(s). To pair another one, run:\n\nDATA_DIR=${env.DATA_DIR} bun run --cwd apps/daemon start pair --url ${serverUrl}\n\n`);
      return;
    }

    const { id, addresses } = await services.server.queries.info();

    const { pin, qr, expiresAt } = await services.auth.actions.bootstrap({
      serverId: id,
      addresses,
      isLocal: true,
    });

    process.stdout.write(`\nNo device is paired. Enter PIN ${pin}, open a link or scan the code with the phone to pair the first device:\n\n${coreNativePairingText(qr, serverUrl)}`);
    timer = setTimeout(() => void issue(), expiresAt - Date.now());
  }

  void issue();

  return () => clearTimeout(timer);
}

async function coreNativePair(url = env.WEB_PUBLIC_URL): Promise<void> {
  const client = createORPCClient<RouterClient<typeof router>>(new RPCLink({
    origin: 'http://localhost',
    url: '/rpc',
    headers: { [SERVER_PROTOCOL.versionHeader]: String(SERVER_PROTOCOL.version) },
    fetch: (request, init) => fetch(request, { ...init, unix: SOCKET }),
  }));

  const { pin, qr } = await client.pairing.bootstrap();

  process.stdout.write(`PIN ${pin}\n\n${coreNativePairingText(qr, serverOrigin.parse(url))}`);
}

function coreNativePairingText(qr: CoreTypes.CorePairingCode, serverUrl: string | URL): string {
  const web = new URL(`/connect#code=${encodeURIComponent(qr.payload)}`, serverUrl).href;

  return `Web: ${web}\n\nApp: ${qr.link}\n\n${renderUnicodeCompact(qr.link)}\n`;
}

async function coreNativeDetach(): Promise<void> {
  await mkdir(dirname(LOG), { recursive: true, mode: OWNER_ONLY });
  const output = await open(LOG, 'a', 0o600);

  try {
    const child = spawn(process.execPath, [ENTRY, 'start'], {
      detached: true,
      stdio: ['ignore', output.fd, output.fd, 'ipc'],
    });

    await new Promise<void>((ready, reject) => {
      child.once('error', reject);
      child.once('exit', () => reject(new Errors.INTERNAL_ERROR({ internal: `Daemon failed to start. See ${LOG}` })));
      child.once('message', (message) => (message === 'daemon:ready'
        ? ready()
        : reject(new Errors.INTERNAL_ERROR({ internal: `Unexpected daemon startup response. See ${LOG}` }))));
    });

    child.disconnect();
    child.unref();
    log.info({
      tag: 'daemon',
      message: 'Daemon started in the background',
      pid: child.pid,
      log: LOG,
    });
  } finally {
    await output.close();
  }
}

async function coreNativeService(command: 'register' | 'unregister'): Promise<void> {
  if (process.platform !== 'darwin') {
    throw new Errors.INTERNAL_ERROR({ internal: 'Login services are supported on macOS only.' });
  }

  const label = `bots.daemon.${createHash('sha256').update(ROOT).digest('hex').slice(0, 12)}`;
  const path = join(homedir(), 'Library', 'LaunchAgents', `${label}.plist`);

  if (command === 'unregister') {
    await rm(path, { force: true });
    log.info({
      tag: 'daemon',
      message: 'Login startup disabled; the running daemon is unchanged',
      path,
    });

    return;
  }

  const agent = {
    Label: label,
    ProgramArguments: [process.execPath, ENTRY, 'start'],
    WorkingDirectory: resolve(import.meta.dirname, '../..'),
    EnvironmentVariables: {
      ...Object.fromEntries(Object.entries(env).map(([key, value]) => [key, String(value)])),
      DATA_DIR: ROOT,
      PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
    },
    RunAtLoad: true,
    StandardOutPath: LOG,
    StandardErrorPath: LOG,
    Umask: 0o077,
  };

  const result = Bun.spawnSync(['/usr/bin/plutil', '-convert', 'xml1', '-o', '-', '-'], { stdin: Buffer.from(JSON.stringify(agent)) });

  if (result.exitCode !== 0) {
    throw new Errors.INTERNAL_ERROR({ internal: result.stderr.toString() });
  }

  await mkdir(dirname(LOG), { recursive: true, mode: OWNER_ONLY });
  await mkdir(dirname(path), { recursive: true, mode: OWNER_ONLY });
  await writeFile(path, result.stdout, { mode: 0o600 });
  log.info({
    tag: 'daemon',
    message: 'Login startup enabled for the next login; the running daemon is unchanged',
    path,
  });
}

async function coreNativeBackup(command: 'create' | 'restore', path: string): Promise<void> {
  const backup = makeBackupService({ root: ROOT });

  await (command === 'create' ? backup.actions.create({ destination: path }) : backup.actions.restore({ bundle: path }));
  log.info({
    tag: 'backup',
    message: `Backup ${command} finished`,
    path,
  });
}
