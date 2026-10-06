import { isIP } from 'node:net';
import { SECURITY } from './security.constants';
import type { SecurityReadRequestTextParams, SecurityReadResult } from '#/types/security.types';

function securityIsPublicIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    return !SECURITY.privateIpV4.test(ip);
  }

  if (version === 6) {
    return !SECURITY.privateIpV6.test(ip);
  }

  return false;
}

function securityStripPort(value: string): string {
  const trimmed = value.trim().replace(/^"|"$/g, '');
  const ipv6 = /^\[([^\]]+)\](?::\d+)?$/.exec(trimmed);

  if (ipv6) {
    return ipv6[1];
  }

  const ipv4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(trimmed);
  return ipv4 ? ipv4[1] : trimmed;
}

export function securityExtractClientIp(headers: Headers): string {
  for (const name of SECURITY.ipAddress.headers) {
    const value = headers.get(name);

    if (!value) {
      continue;
    }

    for (const candidate of value.split(',')) {
      const ip = securityStripPort(candidate);

      if (securityIsPublicIp(ip)) {
        return ip;
      }
    }
  }

  return SECURITY.ipAddress.fallback;
}

export async function securityReadRequestText(request: Request, params: SecurityReadRequestTextParams): Promise<SecurityReadResult> {
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const bytes = Number(contentLength);

    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      return { ok: false, status: 400 };
    }

    if (bytes > params.maxBytes) {
      return { ok: false, status: 413 };
    }
  }

  if (!request.body) {
    return { ok: true, text: '' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  async function securityRead(): Promise<SecurityReadResult> {
    const chunk = await reader.read().catch(() => undefined);

    if (!chunk) {
      return { ok: false, status: 400 };
    }

    if (chunk.done) {
      const body = new Uint8Array(total);
      let offset = 0;

      for (const item of chunks) {
        body.set(item, offset);
        offset += item.byteLength;
      }

      return { ok: true, text: new TextDecoder().decode(body) };
    }

    total += chunk.value.byteLength;

    if (total > params.maxBytes) {
      await reader.cancel().catch(() => undefined);

      return { ok: false, status: 413 };
    }

    chunks.push(chunk.value);

    return securityRead();
  }

  return securityRead();
}
