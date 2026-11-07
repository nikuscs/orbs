export interface RpcProxySocket {
  target: string;
  origin: string | null;
  protocols: string[];
  pending: (string | Uint8Array<ArrayBuffer>)[];
  upstream?: WebSocket;
}
