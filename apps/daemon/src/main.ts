import { envDaemon } from '@orbs/env/daemon';
import { initDaemonLogger, log } from '@orbs/logger/daemon';
import { makeDaemonServices } from '#/core/core.services';

const env = await Promise.try(() => envDaemon(process.env)).catch(() => {
  log.warn({
    tag: 'daemon',
    message: 'daemon not configured: copy apps/daemon/.env.example to apps/daemon/.env',
  });

  return process.exit();
});

initDaemonLogger(env.NODE_ENV);

const services = makeDaemonServices(env, process.env);
void services.pi.actions.problem();
services.connection.actions.open({
  onMessage: (message) => void services.run.actions.receive(message),
  onClose: () => void services.run.actions.abort(),
});

const shutdown = () => {
  services.mcpInternal.actions.dispose();
  services.connection.actions.close();
  services.harness.actions.dispose();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
