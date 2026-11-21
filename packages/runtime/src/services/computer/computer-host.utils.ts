import { Errors } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { match, P } from 'ts-pattern';
import { computerHostResponseEmpty, computerHostResponseScreenshot } from '../../types/computer-host.types';
import { COMPUTER_HOST } from './computer-host.constants';
import { COMPUTER_SECCOMP } from './computer-seccomp.constants';
import {
  computerDriverCreate,
  computerDriverHasImage,
  computerDriverInspect,
  computerDriverPull,
  computerDriverRemove,
  computerDriverStart,
  computerDriverUnpause,
} from './computer.driver';
import type { computerHostResponseTree } from '../../types/computer-host.types';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';
import type { SpacesdClientLike } from '@trycua/cua';
import type { z } from 'zod';

function computerHostArch(): 'arm64' | 'x64' {
  return process.arch === 'arm64' ? 'arm64' : 'x64';
}

export function computerHostPaths({ folder }: HostTypes.ComputerHostServiceDeps, botId: string) {
  const directory = join(folder, botId);

  return {
    directory,
    tokenFile: join(directory, COMPUTER_HOST.files.token),
    thumbnailFile: join(directory, COMPUTER_HOST.files.thumbnail),
  };
}

export function computerHostSdk(runtime: HostTypes.ComputerHostRuntime) {
  runtime.sdk ??= import('@trycua/cua');

  return runtime.sdk;
}

export async function computerHostCall<Schema extends z.ZodType>(
  client: SpacesdClientLike,
  method: string,
  body: object,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const response = await client.callJson(`cua.env.v1.${method}`, JSON.stringify(body), undefined);

  return schema.parse(JSON.parse(response));
}

export async function computerHostPoll<Value>(
  attempt: () => Promise<Value | null>,
  deadline: number = Date.now() + COMPUTER_HOST.readyTimeoutMs,
): Promise<Value | null> {
  const result = await attempt();

  return match(result !== null || Date.now() >= deadline)
    .returnType<Promise<Value | null>>()
    .with(true, () => Promise.resolve(result))
    .with(false, async () => {
      await sleep(COMPUTER_HOST.readyPollMs);

      return computerHostPoll(attempt, deadline);
    })
    .exhaustive();
}

export function computerHostTruncate(text: string, limit: number = COMPUTER_HOST.textLimit): string {
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated ${text.length - limit} characters]` : text;
}

async function computerHostSha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function computerHostEnsureSpacesd({ folder }: HostTypes.ComputerHostServiceDeps): Promise<string> {
  const arch = computerHostArch();
  const asset = COMPUTER_HOST.spacesd.assets[arch];
  const directory = join(folder, COMPUTER_HOST.files.binDirectory);
  const target = join(directory, `cua-spacesd-${COMPUTER_HOST.spacesd.version}-${arch}`);

  return match(await stat(target).catch(() => null))
    .with(P.nonNullable, () => target)
    .otherwise(async () => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const response = await fetch(`${COMPUTER_HOST.spacesd.downloadBase}/${asset.name}`);

      match(response.ok)
        .with(true, () => undefined)
        .with(false, () => {
          throw new Errors.INTERNAL_ERROR({ internal: `Downloading ${asset.name} failed with ${response.status}.` });
        })
        .exhaustive();

      const partial = `${target}.${randomBytes(4).toString('hex')}.part`;
      await writeFile(partial, new Uint8Array(await response.arrayBuffer()));

      await match(await computerHostSha256(partial) === asset.sha256)
        .with(true, () => undefined)
        .with(false, async () => {
          await rm(partial, { force: true });
          throw new Errors.INTERNAL_ERROR({ internal: `Checksum mismatch for ${asset.name}.` });
        })
        .exhaustive();

      await chmod(partial, 0o755);
      await rename(partial, target);

      return target;
    });
}

async function computerHostEnsureImage(socket: string): Promise<string> {
  const image = COMPUTER_HOST.images[computerHostArch()];

  await match(await computerDriverHasImage(socket, image))
    .with(true, () => undefined)
    .with(false, () => computerDriverPull(socket, image))
    .exhaustive();

  return image;
}

async function computerHostWriteToken(runtime: HostTypes.ComputerHostRuntime, botId: string, token: string): Promise<void> {
  const { directory, tokenFile } = computerHostPaths(runtime, botId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(tokenFile, token, { mode: 0o600 });
  await chmod(tokenFile, 0o600);
}

export async function computerHostEnsureContainer(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<void> {
  const image = await computerHostEnsureImage(runtime.socket);
  const spacesdFile = await computerHostEnsureSpacesd(runtime);
  const credentialKey = COMPUTER_HOST.credentialKey(botId);
  const stored = await runtime.credentials.queries.get({ key: credentialKey });
  const found = await computerDriverInspect(runtime.socket, botId);

  const inspected = await match({ found, stored })
    .with({ found: P.nonNullable, stored: P.nullish }, async () => {
      await computerDriverRemove(runtime.socket, botId);

      return null;
    })
    .otherwise(() => found);

  const token = await match({ inspected, stored })
    .with({ inspected: P.nullish }, async () => {
      const created = randomBytes(32).toString('hex');
      await runtime.credentials.actions.set({ key: credentialKey, value: created });

      return created;
    })
    .otherwise(() => stored);

  const secret = match(token)
    .with(P.string.minLength(1), (value) => value)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: 'Computer token is unavailable.' });
    });

  const { tokenFile } = computerHostPaths(runtime, botId);
  const hasTokenFile = await stat(tokenFile).then(() => true, () => false);

  await match({ inspected, hasTokenFile })
    .with({ inspected: P.nullish }, { hasTokenFile: false }, () => computerHostWriteToken(runtime, botId, secret))
    .otherwise(() => undefined);

  await match(inspected)
    .with(P.nullish, async () => {
      await computerDriverCreate(runtime.socket, {
        botId,
        image,
        tokenFile,
        spacesdFile,
        seccomp: JSON.stringify(COMPUTER_SECCOMP),
      });
      await computerDriverStart(runtime.socket, botId);
    })
    .with({ status: 'paused' }, () => computerDriverUnpause(runtime.socket, botId))
    .with({ status: 'running' }, () => undefined)
    .otherwise(async () => {
      await computerHostCloseSession(runtime, botId);
      await computerDriverStart(runtime.socket, botId);
    });
}

export async function computerHostCloseSession(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<void> {
  const session = runtime.sessions.get(botId);
  runtime.sessions.delete(botId);

  await match(session)
    .with(P.nonNullable, (open) => computerHostCloseBrowser(open))
    .otherwise(() => undefined);
}

export async function computerHostCloseBrowser(session: HostTypes.ComputerHostSession): Promise<void> {
  const browser = session.browser;
  session.browser = null;

  await match(browser)
    .with(P.nonNullable, async (open) => {
      await open.browser.close().catch((cause: unknown) => log.warn({
        tag: 'computer',
        message: 'Closing the browser connection failed.',
        cause,
      }));
      await open.tunnel.stop().catch((cause: unknown) => log.warn({
        tag: 'computer',
        message: 'Stopping the browser tunnel failed.',
        cause,
      }));
    })
    .otherwise(() => undefined);
}

export async function computerHostConnect(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<HostTypes.ComputerHostSession> {
  return match(runtime.sessions.get(botId))
    .with(P.nonNullable, (existing) => existing)
    .otherwise(() => computerHostOpenSession(runtime, botId));
}

async function computerHostOpenSession(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<HostTypes.ComputerHostSession> {
  const inspected = await computerDriverInspect(runtime.socket, botId);
  const token = await runtime.credentials.queries.get({ key: COMPUTER_HOST.credentialKey(botId) });

  const { port, secret } = match({ inspected, token })
    .with({ inspected: { status: 'running', port: P.number }, token: P.string.minLength(1) }, (ready) => ({ port: ready.inspected.port, secret: ready.token }))
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: COMPUTER_HOST.notRunning });
    });

  const sdk = await computerHostSdk(runtime);
  const cua = sdk.embedded();
  const url = `http://127.0.0.1:${port}`;

  const client = await computerHostPoll(async () => {
    try {
      const candidate = await cua.spacesd(url, secret);
      await computerHostCall(candidate, 'SystemService/GetCapabilities', {}, computerHostResponseEmpty);

      return candidate;
    } catch {
      return null;
    }
  });

  const ready = match(client)
    .with(P.nonNullable, (value) => value)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: 'The computer did not become ready in time.' });
    });

  const session: HostTypes.ComputerHostSession = { client: ready, browser: null, windowNumbers: new Map(), windowRefs: new Map() };
  runtime.sessions.set(botId, session);

  return session;
}

export async function computerHostPrepare(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<HostTypes.ComputerHostSession> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  return match(inspected?.status)
    .with('paused', () => {
      throw new Errors.INTERNAL_ERROR({ internal: COMPUTER_HOST.asleep });
    })
    .otherwise(() => computerHostConnect(runtime, botId));
}

export async function computerHostSession(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<HostTypes.ComputerHostSession> {
  const inspected = await computerDriverInspect(runtime.socket, botId);

  return match({ status: inspected?.status, session: runtime.sessions.get(botId) })
    .with({ status: 'paused' }, () => {
      throw new Errors.INTERNAL_ERROR({ internal: COMPUTER_HOST.asleep });
    })
    .with({ status: 'running', session: P.nonNullable }, ({ session }) => session)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: COMPUTER_HOST.notRunning });
    });
}

export async function computerHostCapture(
  session: HostTypes.ComputerHostSession,
  request: HostTypes.ComputerHostCaptureParams,
): Promise<ComputerTypes.ComputerImage> {
  const body: HostTypes.ComputerHostCaptureBody = {
    format: request.format === 'png' ? 'IMAGE_FORMAT_PNG' : 'IMAGE_FORMAT_JPEG',
    quality: request.quality,
    maxDimension: request.maxDimension,
    window: request.windowId === undefined ? undefined : computerHostWindowRef(session, request.windowId),
  };

  const response = await computerHostCall(session.client, 'ComputerService/Screenshot', body, computerHostResponseScreenshot);

  return {
    data: response.image,
    mimeType: request.format === 'png' ? 'image/png' : 'image/jpeg',
    width: response.imageSize.width,
    height: response.imageSize.height,
  };
}

export async function computerHostSaveThumbnail(
  runtime: HostTypes.ComputerHostRuntime,
  botId: string,
): Promise<ComputerTypes.ComputerThumbnailFile | null> {
  const status = (await computerDriverInspect(runtime.socket, botId))?.status;

  return match(status)
    .with('running', async () => {
      const session = await computerHostConnect(runtime, botId);
      const image = await computerHostCapture(session, { format: 'jpeg', ...COMPUTER_HOST.thumbnail });
      const { directory, thumbnailFile } = computerHostPaths(runtime, botId);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(thumbnailFile, Buffer.from(image.data, 'base64'));

      return { data: image.data, mimeType: image.mimeType, takenAt: Date.now() };
    })
    .otherwise(() => null);
}

export async function computerHostTryThumbnail(runtime: HostTypes.ComputerHostRuntime, botId: string): Promise<void> {
  try {
    await computerHostSaveThumbnail(runtime, botId);
  } catch (cause) {
    log.warn({
      tag: 'computer',
      message: 'Saving the computer thumbnail failed.',
      botId,
      cause,
    });
  }
}

export function computerHostKey(name: string): { named: string } | { character: string } {
  const lower = name.toLowerCase();
  const named = Object.entries(COMPUTER_HOST.keys).find(([alias]) => alias === lower)?.[1];

  return match({
    named,
    lower,
    name,
  })
    .with({ named: P.string }, (key) => ({ named: key.named }))
    .with({ lower: P.string.regex(/^f([1-9]|1\d|2[0-4])$/u) }, (key) => ({ named: `KEY_${key.lower.toUpperCase()}` }))
    .with({ name: P.string.regex(/^.$/u) }, (key) => ({ character: key.name.toLowerCase() }))
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: `Unknown key "${name}".` });
    });
}

export function computerHostRenderTree(tree: z.infer<typeof computerHostResponseTree>): string {
  const lines = tree.nodes.map((node) => {
    const label = [node.role, node.name ? `"${node.name}"` : '', node.value ? `= "${node.value}"` : ''].filter(Boolean).join(' ');

    const center = node.bounds && (node.bounds.width > 0 || node.bounds.height > 0)
      ? ` @${Math.round(node.bounds.x + node.bounds.width / 2)},${Math.round(node.bounds.y + node.bounds.height / 2)}`
      : '';

    return `${'  '.repeat(node.depth)}${label}${center}`;
  });

  return computerHostTruncate(`${lines.join('\n')}${tree.truncated ? '\n[tree truncated]' : ''}`);
}

export function computerHostWindowRef(session: HostTypes.ComputerHostSession, windowId: number): HostTypes.ComputerHostWindowRef {
  return match(session.windowRefs.get(windowId))
    .with(P.nonNullable, (ref) => ref)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: `Window ${windowId} is unknown; list the windows first.` });
    });
}
