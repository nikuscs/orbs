import type { makeServices } from '@repo/server/server';
import type { Server, ServerWebSocket } from 'bun';

export type CoreServices = Awaited<ReturnType<typeof makeServices>>;

export interface CoreSocketRpc {
  kind: 'rpc';
}

export interface CoreSocketComputer {
  kind: 'computer';
  upstream: WebSocket;
  pending: (string | ArrayBuffer)[];
  isOpen: boolean;
}

export type CoreSocket = CoreSocketRpc | CoreSocketComputer;

export type CoreSocketHandle = Pick<ServerWebSocket<CoreSocket>, 'send' | 'close'>;

export type CoreServer = Server<CoreSocket>;

export type CoreHandler<T extends Request> = (request: T, server: CoreServer) => Response | undefined | Promise<Response | undefined>;

export type CorePairingCode = Awaited<ReturnType<CoreServices['auth']['actions']['bootstrap']>>['qr'];

export type CoreComputerEndpoint = (params: { botId: string }) => Promise<string | null>;

export interface CoreComputerProxyParams {
  botId: string;
  rest: string;
  search: string;
  endpoint: CoreComputerEndpoint;
}

export interface CoreOriginOptions {
  isOpaqueAllowed: boolean;
}
