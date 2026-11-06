import { lookup } from 'node:dns/promises';
import { existsSync } from 'node:fs';
import { hostname, networkInterfaces } from 'node:os';
import { DESKTOP_BUILD } from './desktop-build';
import { DESKTOP } from './desktop.constants';
import { desktopHealth, desktopTailscaleStatus } from './types/desktop.types';
import type * as DesktopTypes from './types/desktop.types';

async function desktopTailscaleJson(binary: string): Promise<unknown> {
  try {
    const child = Bun.spawn([binary, 'status', '--json'], {
      stdout: 'pipe',
      stderr: 'ignore',
      timeout: DESKTOP.probeTimeoutMs,
    });

    return JSON.parse(await new Response(child.stdout).text());
  } catch {
    return null;
  }
}

export function desktopNetworkUrl(host: string, port: number): string {
  return `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
}

export async function desktopNetworkOrigins(port: number): Promise<DesktopTypes.DesktopOrigins> {
  const binary = DESKTOP.tailscaleBinaries.find((path) => existsSync(path));

  if (!binary) {
    return { tailscale: 'missing', urls: [] };
  }

  const status = desktopTailscaleStatus.safeParse(await desktopTailscaleJson(binary));

  if (!status.success || status.data.BackendState !== 'Running') {
    return { tailscale: 'stopped', urls: [] };
  }

  const name = status.data.Self.DNSName.replace(/\.$/u, '');
  const hosts = [name, name.split('.')[0], ...status.data.Self.TailscaleIPs];

  return { tailscale: 'running', urls: [...new Set(hosts)].map((host) => desktopNetworkUrl(host, port)) };
}

export async function desktopNetworkTailscale(address: string): Promise<boolean> {
  const binary = DESKTOP.tailscaleBinaries.find((candidate) => existsSync(candidate));

  if (!binary) {
    return false;
  }

  const status = desktopTailscaleStatus.safeParse(await desktopTailscaleJson(binary));

  if (!status.success) {
    return false;
  }

  const host = new URL(address).hostname.replace(/^\[|\]$/gu, '').replace(/\.$/u, '').toLowerCase();

  return [status.data.Self, ...Object.values(status.data.Peer ?? {})].some((peer) => {
    const name = peer.DNSName.replace(/\.$/u, '').toLowerCase();

    return peer.TailscaleIPs.includes(host) || name === host || name.split('.')[0] === host;
  });
}

export async function desktopNetworkProbe(address: string, timeoutMs: number = DESKTOP.probeTimeoutMs): Promise<DesktopTypes.DesktopProbe> {
  const parsed = URL.parse(address.trim());

  if (!parsed || !DESKTOP.remoteProtocols.includes(parsed.protocol) || parsed.username || parsed.password) {
    return { status: 'invalid' };
  }

  const url = parsed.origin;
  const response = await fetch(`${url}${DESKTOP.healthPath}`, { signal: AbortSignal.timeout(timeoutMs) }).catch(() => null);

  if (!response) {
    return { status: 'unreachable', url };
  }

  const health = desktopHealth.safeParse(await response.json().catch(() => null));

  return { status: health.success ? 'ok' : 'foreign', url };
}

export async function desktopNetworkSelf(url: string, server: DesktopTypes.DesktopServer): Promise<boolean> {
  function desktopNetworkAddress(address: string): string {
    const mapped = address.toLowerCase().replace(/^::ffff:/u, '');
    const hex = /^([\da-f]{1,4}):([\da-f]{1,4})$/u.exec(mapped);

    return hex ? [hex[1], hex[2]].flatMap((part) => {
      const value = Number.parseInt(part, 16);

      return [value >> 8, value & 0xff];
    }).join('.') : mapped;
  }

  const target = new URL(url);

  if (server.urls.includes(target.origin)) {
    return true;
  }

  if (Number(target.port) !== server.port) {
    return false;
  }

  const resolved = await lookup(target.hostname.replace(/^\[|\]$/gu, ''), { all: true }).catch(() => []);
  const interfaces = Object.values(networkInterfaces()).flatMap((items) => items?.map((item) => item.address) ?? []);
  const local = new Set([...DESKTOP.selfHosts, ...interfaces].map(desktopNetworkAddress));

  return resolved.some(({ address }) => local.has(desktopNetworkAddress(address)));
}

/** This Mac's network name without the Bonjour suffix, such as `studio-mac`. */
export function desktopNetworkHost(): string {
  return hostname().replace(/\.local$/u, '');
}

export function desktopNetworkAdvertise(port: number): () => void {
  // /usr/bin/dns-sd is built-in on macOS; on Linux, fall back silently if not installed.
  if (!existsSync(DESKTOP.find.dnsSd)) {
    return () => undefined;
  }

  const name = `${DESKTOP_BUILD.name} on ${desktopNetworkHost()}`;
  const child = Bun.spawn([DESKTOP.find.dnsSd, '-R', name, DESKTOP.find.service, 'local', String(port)], { stdout: 'ignore', stderr: 'ignore' });

  return () => child.kill();
}

export async function desktopNetworkFind(server: DesktopTypes.DesktopServer | null): Promise<DesktopTypes.DesktopFound[]> {
  async function desktopNetworkRun(command: string[], timeout: number): Promise<string> {
    const child = Bun.spawn(command, {
      stdout: 'pipe',
      stderr: 'ignore',
      timeout,
    });

    return new Response(child.stdout).text();
  }

  async function desktopNetworkBonjour(): Promise<DesktopTypes.DesktopFound[]> {
    // /usr/bin/dns-sd is built-in on macOS; if absent on Linux, skip Bonjour and fall back to candidate port probing.
    if (!existsSync(DESKTOP.find.dnsSd)) {
      return [];
    }

    const browse = await desktopNetworkRun([DESKTOP.find.dnsSd, '-B', DESKTOP.find.service, 'local'], DESKTOP.find.browseMs);
    const names = new Set(browse.split('\n').flatMap((line) => (/\sAdd\s/u.test(line) ? [line.split(`${DESKTOP.find.service}.`)[1]?.trim() ?? ''] : [])).filter(Boolean));

    const resolved = await Promise.all([...names].map(async (name) => {
      const found = /can be reached at (\S+?)\.?:(\d+)/u.exec(await desktopNetworkRun([DESKTOP.find.dnsSd, '-L', name, DESKTOP.find.service, 'local'], DESKTOP.find.resolveMs));

      return found ? [{ name: found[1].replace(/\.local$/u, ''), url: desktopNetworkUrl(found[1], Number(found[2])) }] : [];
    }));

    return resolved.flat();
  }

  async function desktopNetworkPeers(): Promise<DesktopTypes.DesktopFound[]> {
    const binary = DESKTOP.tailscaleBinaries.find((candidate) => existsSync(candidate));
    const status = binary ? desktopTailscaleStatus.safeParse(await desktopTailscaleJson(binary)) : null;
    const peers = status?.success ? Object.values(status.data.Peer ?? {}).filter((peer) => peer.Online !== false) : [];

    return peers.flatMap((peer) => {
      const name = peer.DNSName.split('.')[0];

      return name ? DESKTOP.find.ports.map((port) => ({ name, url: desktopNetworkUrl(name, port) })) : [];
    });
  }

  const [peers, bonjour] = await Promise.all([
    desktopNetworkPeers(),
    desktopNetworkBonjour(),
  ]);

  const candidates = [...peers, ...bonjour];

  const answering = await Promise.all(candidates.map(async (candidate) => {
    const probe = await desktopNetworkProbe(candidate.url, DESKTOP.find.probeMs);
    const self = probe.status === 'ok' && server !== null && await desktopNetworkSelf(candidate.url, server);

    return probe.status === 'ok' && !self ? [candidate] : [];
  }));

  const servers = new Map<string, DesktopTypes.DesktopFound>();

  for (const found of answering.flat()) {
    if (!servers.has(found.name.toLowerCase())) {
      servers.set(found.name.toLowerCase(), found);
    }
  }

  return [...servers.values()];
}
