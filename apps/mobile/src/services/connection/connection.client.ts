import { CHAT, connectionAddressesMerge, connectionAddressPick, connectionRpcUrl, makeHttpClient } from '@repo/client/client';
import { connectionStored, SERVER_PROTOCOL } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import * as SecureStore from 'expo-secure-store';
import { match, P } from 'ts-pattern';
import { CONNECTION_STORAGE_KEY } from './connection.constants';
import type * as ConnectionTypes from '@/types/connection.types';
import type { RpcSession } from '@/types/rpc.types';
import type { ConnectionSaved } from '@repo/contracts/universal';
import type { ImageURISource } from 'react-native';

export async function connectionRead(): Promise<ConnectionSaved | null> {
  const saved = await SecureStore.getItemAsync(CONNECTION_STORAGE_KEY);

  return connectionStored.safeParse(saved).data ?? null;
}

export async function connectionForget(connection: ConnectionSaved): Promise<boolean> {
  const saved = await connectionRead();

  if (saved?.token !== connection.token) {
    return false;
  }

  await SecureStore.deleteItemAsync(CONNECTION_STORAGE_KEY);

  return true;
}

export async function connectionPair({ entry, address, name }: ConnectionTypes.ConnectionPairParams): Promise<ConnectionSaved> {
  const picked = await match(entry.target)
    .with(P.nonNullable, async (target) => (await connectionAddressPick(target)).address)
    .otherwise(async () => address);

  if (!picked) {
    throw new Errors.SERVER_UNREACHABLE();
  }

  const redeemed = await makeHttpClient(() => ({ url: connectionRpcUrl(picked) })).pairing.redeem({ pin: entry.pin, name });

  const connection: ConnectionSaved = {
    serverId: redeemed.serverId,
    addresses: connectionAddressesMerge([picked], redeemed.addresses),
    deviceId: redeemed.device.id,
    token: redeemed.token,
  };

  await SecureStore.setItemAsync(CONNECTION_STORAGE_KEY, JSON.stringify(connection));

  return connection;
}

export async function connectionAddressesSave({ connection, addresses }: ConnectionTypes.ConnectionAddressesParams): Promise<void> {
  connection.addresses = addresses;
  await SecureStore.setItemAsync(CONNECTION_STORAGE_KEY, JSON.stringify(connection));
}

export function connectionAddressesLearn({ connection, addresses }: ConnectionTypes.ConnectionAddressesParams): Promise<void> {
  return connectionAddressesSave({ connection, addresses: connectionAddressesMerge(connection.addresses, addresses) });
}

export function connectionFileSource(session: Pick<RpcSession, 'connection' | 'address'>, { botId, attachmentId }: ConnectionTypes.ConnectionFileParams): ImageURISource {
  return {
    uri: new URL(`${CHAT.filesPath}/${encodeURIComponent(botId)}/${encodeURIComponent(attachmentId)}`, session.address().url).toString(),
    headers: {
      authorization: `Bearer ${session.connection.token}`,
      [SERVER_PROTOCOL.versionHeader]: String(SERVER_PROTOCOL.version),
      [SERVER_PROTOCOL.serverIdHeader]: session.connection.serverId,
    },
  };
}

export function connectionAvatarUri({ session, src }: ConnectionTypes.ConnectionAvatarParams): string {
  return session ? new URL(src, session.address().url).toString() : src;
}
