import { connectionAddressPick } from '@repo/client/client';
import { connectionPairingStored, connectionStored, SERVER_PROTOCOL } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { parse, serialize } from 'cookie-es';
import { CONNECTION } from './connection.constants';
import type { ConnectionTargetResult } from '@/types/connection.types';
import type { ConnectionTarget } from '@repo/client/client';
import type { ConnectionSaved } from '@repo/contracts/universal';

const connectionTargets = new Map<string, { url: string; pickedAt: number }>();

export function connectionParse(cookies: string): ConnectionSaved | null {
  return connectionStored.safeParse(parse(cookies)[CONNECTION.storageKey]).data ?? null;
}

export function connectionFileHeaders(cookies: string): Record<string, string> {
  const connection = connectionParse(cookies);

  return connection
    ? {
      'authorization': `Bearer ${connection.token}`,
      [SERVER_PROTOCOL.versionHeader]: String(SERVER_PROTOCOL.version),
      [SERVER_PROTOCOL.serverIdHeader]: connection.serverId,
    }
    : {};
}

export function connectionCookie(connection: ConnectionSaved | null, secure: boolean): string {
  return serialize(CONNECTION.storageKey, connection ? JSON.stringify(connection) : '', {
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: connection ? CONNECTION.cookieMaxAgeSeconds : 0,
  });
}

export function connectionPairingCookie(target: ConnectionTarget | null, secure: boolean): string {
  return serialize(CONNECTION.pairingKey, target ? JSON.stringify({ serverId: target.serverId, addresses: target.addresses }) : '', {
    path: '/',
    sameSite: 'strict',
    secure,
    maxAge: target ? CONNECTION.pairingMaxAgeSeconds : 0,
  });
}

export function connectionHasAddresses(cookies: string): boolean {
  const parsed = parse(cookies);

  return CONNECTION.storageKey in parsed || CONNECTION.pairingKey in parsed;
}

export async function connectionTarget(cookies: string): Promise<ConnectionTargetResult> {
  const target = connectionParse(cookies) ?? connectionPairingStored.safeParse(parse(cookies)[CONNECTION.pairingKey]).data;

  if (!target) {
    return { url: null, isMismatch: false };
  }

  const key = JSON.stringify([target.serverId, target.addresses]);
  const now = Date.now();
  const cached = connectionTargets.get(key);

  if (cached && now - cached.pickedAt < CONNECTION.targetCacheMs) {
    return { url: cached.url, isMismatch: false };
  }

  connectionTargets.forEach((entry, entryKey) => {
    if (now - entry.pickedAt >= CONNECTION.targetCacheMs) {
      connectionTargets.delete(entryKey);
    }
  });

  const { address, isMismatch } = await connectionAddressPick(target);

  if (address) {
    connectionTargets.set(key, { url: address.url, pickedAt: now });
  }

  return { url: address?.url ?? null, isMismatch };
}

export function connectionDeviceName(): string {
  if (window.__botsHost) {
    return m.connect_device_name_desktop({ host: window.__botsHost });
  }

  const browser = CONNECTION.browsers.find(([, pattern]) => pattern.test(navigator.userAgent))?.[0];
  const system = CONNECTION.systems.find(([, pattern]) => pattern.test(navigator.userAgent))?.[0];

  return browser && system ? m.connect_device_name_browser({ browser, system }) : m.connect_device_name_default();
}

export function connectionCodeFromLink(value: string): string {
  return URL.canParse(value) ? new URLSearchParams(new URL(value).hash.slice(1)).get('code') ?? value : value;
}
