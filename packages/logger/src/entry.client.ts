import { clearIdentity, initLog, log, setIdentity } from 'evlog/client';

initLog({
  service: 'orbs-web',
  console: Boolean(import.meta.env.DEV),
  pretty: Boolean(import.meta.env.DEV),
  transport: {
    enabled: true,
    endpoint: '/t/ingest',
  },
});

export { log, setIdentity, clearIdentity };
