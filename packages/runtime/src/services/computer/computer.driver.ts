import { Errors } from '@repo/errors/universal';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { match, P } from 'ts-pattern';
import {
  computerHostDriverInspect,
  computerHostDriverList,
  computerHostDriverMessage,
  computerHostDriverVolumes,
} from '../../types/computer-host.types';
import { COMPUTER_HOST } from './computer-host.constants';
import type {
  ComputerHostDriverCreateParams,
  ComputerHostDriverInspection,
  ComputerHostDriverRequestParams,
} from '../../types/computer-host.types';

export function computerDriverSocket(dockerHost: string | undefined): string {
  const desktop = join(homedir(), '.docker', 'run', 'docker.sock');

  return match(dockerHost)
    .with(P.string.startsWith('unix://'), (host) => host.slice('unix://'.length))
    .otherwise(() => (existsSync(desktop) ? desktop : '/var/run/docker.sock'));
}

function computerDriverContainerName(botId: string): string {
  return `${COMPUTER_HOST.namePrefix}${botId}`;
}

function computerDriverVolumeName(botId: string): string {
  return `${COMPUTER_HOST.namePrefix}${botId}${COMPUTER_HOST.homeVolumeSuffix}`;
}

async function computerDriverRequest(socket: string, params: ComputerHostDriverRequestParams): Promise<Response> {
  const { method, path, body, headers, accept = [] } = params;

  const requestHeaders = new Headers(headers);

  match(body)
    .with(P.nullish, () => undefined)
    .otherwise(() => requestHeaders.set('content-type', 'application/json'));

  const init: RequestInit & { unix: string } = {
    method,
    unix: socket,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  const response = await fetch(`${COMPUTER_HOST.dockerApi}${path}`, init).catch((cause: unknown) => {
    throw new Errors.INTERNAL_ERROR({ internal: COMPUTER_HOST.dockerMissing, cause });
  });

  return match(response.ok || accept.includes(response.status))
    .with(true, () => response)
    .with(false, async () => {
      const parsed = computerHostDriverMessage.safeParse(await response.json().catch(() => null));
      const detail = parsed.success ? (parsed.data.message ?? parsed.data.error ?? '') : '';

      throw new Errors.INTERNAL_ERROR({ internal: `Docker ${method} ${path} failed with ${response.status}: ${detail}` });
    })
    .exhaustive();
}

export async function computerDriverHasImage(socket: string, image: string): Promise<boolean> {
  const response = await computerDriverRequest(socket, {
    method: 'GET',
    path: `/images/${encodeURIComponent(image)}/json`,
    accept: [404],
  });

  await response.body?.cancel();

  return response.ok;
}

export async function computerDriverPull(socket: string, image: string): Promise<void> {
  const separator = image.lastIndexOf(':');
  const name = image.slice(0, separator);
  const tag = image.slice(separator + 1);

  const response = await computerDriverRequest(socket, {
    method: 'POST',
    path: `/images/create?fromImage=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`,
    headers: { 'x-registry-auth': 'e30=' },
  });

  for (const line of (await response.text()).split('\n')) {
    const message = computerHostDriverMessage.safeParse(line.trim() === '' ? null : JSON.parse(line));

    match(message)
      .with({ success: true, data: { error: P.string.minLength(1) } }, ({ data }) => {
        throw new Errors.INTERNAL_ERROR({ internal: `Pulling ${image} failed: ${data.error}` });
      })
      .otherwise(() => undefined);
  }
}

export async function computerDriverCreate(socket: string, params: ComputerHostDriverCreateParams): Promise<void> {
  const { botId, image, tokenFile, spacesdFile, seccomp } = params;
  const port = `${COMPUTER_HOST.spacesdPort}/tcp`;

  const response = await computerDriverRequest(socket, {
    method: 'POST',
    path: `/containers/create?name=${encodeURIComponent(computerDriverContainerName(botId))}`,
    body: {
      Image: image,
      Labels: { [COMPUTER_HOST.labelKey]: botId },
      ExposedPorts: { [port]: {} },
      HostConfig: {
        Memory: COMPUTER_HOST.memoryBytes,
        NanoCpus: COMPUTER_HOST.nanoCpus,
        ShmSize: COMPUTER_HOST.shmBytes,
        SecurityOpt: [`seccomp=${seccomp}`],
        PortBindings: { [port]: [{ HostIp: '127.0.0.1', HostPort: '' }] },
        Binds: [
          `${computerDriverVolumeName(botId)}:${COMPUTER_HOST.mounts.home}`,
          `${tokenFile}:${COMPUTER_HOST.mounts.token}:ro`,
          `${spacesdFile}:${COMPUTER_HOST.mounts.spacesd}:ro`,
        ],
      },
    },
  });

  await response.body?.cancel();
}

async function computerDriverAction(socket: string, botId: string, action: string, query = ''): Promise<void> {
  const response = await computerDriverRequest(socket, {
    method: 'POST',
    path: `/containers/${computerDriverContainerName(botId)}/${action}${query}`,
    accept: [304, 404],
  });

  await response.body?.cancel();
}

export function computerDriverStart(socket: string, botId: string): Promise<void> {
  return computerDriverAction(socket, botId, 'start');
}

export function computerDriverPause(socket: string, botId: string): Promise<void> {
  return computerDriverAction(socket, botId, 'pause');
}

export function computerDriverUnpause(socket: string, botId: string): Promise<void> {
  return computerDriverAction(socket, botId, 'unpause');
}

export function computerDriverStop(socket: string, botId: string): Promise<void> {
  return computerDriverAction(socket, botId, 'stop', `?t=${COMPUTER_HOST.stopTimeoutSeconds}`);
}

export async function computerDriverRemove(socket: string, botId: string): Promise<void> {
  const response = await computerDriverRequest(socket, {
    method: 'DELETE',
    path: `/containers/${computerDriverContainerName(botId)}?force=true&v=true`,
    accept: [404],
  });

  await response.body?.cancel();
}

export async function computerDriverRemoveVolume(socket: string, botId: string): Promise<void> {
  const response = await computerDriverRequest(socket, {
    method: 'DELETE',
    path: `/volumes/${computerDriverVolumeName(botId)}?force=true`,
    accept: [404],
  });

  await response.body?.cancel();
}

export async function computerDriverList(socket: string): Promise<string[]> {
  const filters = JSON.stringify({ label: [COMPUTER_HOST.labelKey] });

  const response = await computerDriverRequest(socket, {
    method: 'GET',
    path: `/containers/json?all=true&filters=${encodeURIComponent(filters)}`,
  });

  return computerHostDriverList.parse(await response.json()).flatMap((container) => {
    const botId = container.Labels?.[COMPUTER_HOST.labelKey];

    return botId ? [botId] : [];
  });
}

export async function computerDriverListVolumes(socket: string): Promise<string[]> {
  const filters = JSON.stringify({ name: [COMPUTER_HOST.namePrefix] });

  const response = await computerDriverRequest(socket, {
    method: 'GET',
    path: `/volumes?filters=${encodeURIComponent(filters)}`,
  });

  return (computerHostDriverVolumes.parse(await response.json()).Volumes ?? []).flatMap(({ Name: name }) => (
    name.startsWith(COMPUTER_HOST.namePrefix) && name.endsWith(COMPUTER_HOST.homeVolumeSuffix)
      ? [name.slice(COMPUTER_HOST.namePrefix.length, -COMPUTER_HOST.homeVolumeSuffix.length)]
      : []
  ));
}

export async function computerDriverInspect(socket: string, botId: string): Promise<ComputerHostDriverInspection | null> {
  const response = await computerDriverRequest(socket, {
    method: 'GET',
    path: `/containers/${computerDriverContainerName(botId)}/json`,
    accept: [404],
  });

  return match(response.ok)
    .with(false, async () => {
      await response.body?.cancel();

      return null;
    })
    .with(true, async () => {
      const inspected = computerHostDriverInspect.parse(await response.json());
      const hostPort = inspected.NetworkSettings.Ports?.[`${COMPUTER_HOST.spacesdPort}/tcp`]?.[0]?.HostPort;
      const port = hostPort ? Number(hostPort) : null;

      return { status: inspected.State.Status, port: port !== null && Number.isFinite(port) ? port : null };
    })
    .exhaustive();
}
