import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { promisify } from 'node:util';
import { match } from 'ts-pattern';
import { serverTailscaleStatus } from '../../types/server.types';
import { SERVER } from './server.constants';
import type { ServerNetworkDeps } from '../../types/server.types';
import type { ServerAddress } from '@repo/contracts/universal';

export async function serverNetworkQueryAddresses({ host, port }: ServerNetworkDeps): Promise<ServerAddress[]> {
  const serverNetworkUrl = (address: string) => `http://${address.includes(':') ? `[${address}]` : address}:${port}`;

  const serverNetworkIsTailscale = (ip: string) => {
    const [first, second] = ip.split('.').map(Number);

    return first === 100 && second >= 64 && second <= 127;
  };

  const serverNetworkTailscaleName = async () => {
    const binary = SERVER.tailscaleBinaries.find((path) => existsSync(path));

    if (!binary) {
      return [];
    }

    try {
      const { stdout } = await promisify(execFile)(binary, ['status', '--json'], { timeout: SERVER.tailscaleTimeoutMs });
      const status = serverTailscaleStatus.safeParse(JSON.parse(stdout));

      return status.success && status.data.BackendState === 'Running' ? [status.data.Self.DNSName.replace(/\.$/u, '')] : [];
    } catch {
      return [];
    }
  };

  if (!SERVER.wildcardHosts.has(host)) {
    return [{ url: serverNetworkUrl(host), kind: match(host).with('127.0.0.1', 'localhost', '::1', () => 'loopback' as const).otherwise(() => 'lan' as const) }];
  }

  const ips = Object.values(networkInterfaces()).flat()
    .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
    .map((entry) => entry?.address ?? '');

  const tailscaleHosts = [...ips.filter(serverNetworkIsTailscale), ...await serverNetworkTailscaleName()];

  return [
    { url: serverNetworkUrl(SERVER.loopbackHost), kind: 'loopback' },
    ...ips.filter((ip) => !serverNetworkIsTailscale(ip)).map((ip) => ({ url: serverNetworkUrl(ip), kind: 'lan' as const })),
    ...tailscaleHosts.map((tailscaleHost) => ({ url: serverNetworkUrl(tailscaleHost), kind: 'tailscale' as const })),
  ];
}
