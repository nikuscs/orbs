import { log } from '@orbs/logger/daemon';
import { daemonServerMessage, TENANT } from '@orbs/server/daemon';
import { connectionActionSend } from './connection-action.send';
import type { ConnectionActionOpenParams, ConnectionServiceDeps } from '#/types/connection.types';

export function connectionActionOpen(deps: ConnectionServiceDeps, params: ConnectionActionOpenParams): void {
  const url = new URL(TENANT.daemonSocketPath, deps.env.ORBS_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(url, { headers: { [TENANT.daemonKeyHeader]: deps.env.ORBS_API_KEY } });
  deps.socket.current = socket;

  socket.addEventListener('open', () => {
    log.info({
      tag: 'daemon',
      message: 'daemon connected',
      url: url.origin,
    });
    void deps.harness.queries.catalogue().then((harnesses) => connectionActionSend(deps, {
      type: 'daemon.ready',
      protocol: TENANT.daemonProtocol,
      harnesses,
      maxTurns: deps.env.ORBS_MAX_TURNS,
    }));
  });
  socket.addEventListener('message', (event) => {
    const message = daemonServerMessage.safeParse(JSON.parse(String(event.data)));

    if (message.success) {
      params.onMessage(message.data);
    }
  });
  socket.addEventListener('close', (event) => {
    if (deps.socket.current === socket) {
      deps.socket.current = undefined;
    }

    if (deps.socket.closed) {
      return;
    }

    params.onClose();

    if (event.code === TENANT.daemonReplacedCloseCode) {
      log.error({
        tag: 'daemon',
        message: 'replaced by a newer daemon; not reconnecting',
      });
      return;
    }

    if (event.code === TENANT.daemonProtocolCloseCode) {
      log.error({
        tag: 'daemon',
        message: `server refused this daemon: it speaks protocol ${TENANT.daemonProtocol} and the server needs protocol ${event.reason}; update the older one, then restart it`,
      });
      return;
    }

    if (event.code === TENANT.revokedCloseCode) {
      log.error({
        tag: 'daemon',
        message: 'daemon key deleted; not reconnecting',
      });
      return;
    }

    log.warn({
      tag: 'daemon',
      message: 'daemon disconnected',
      code: event.code,
    });
    setTimeout(() => connectionActionOpen(deps, params), TENANT.reconnectDelayMs);
  });
}
