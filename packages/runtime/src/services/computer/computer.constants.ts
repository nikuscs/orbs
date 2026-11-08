import { defineDoc } from '@earendil-works/pi-durable';
import type { ComputerRecord } from '../../types/computer.types';

export const COMPUTER = {
  task: 'bots.computer',
  extension: 'bots.computer',
  toolsExtension: 'bots.computer-tools',
  sleepAfterMs: 300_000,
  shutdownAfterMs: 1_800_000,
  maxLifetimeMs: 7_200_000,
  viewerTicketSeconds: 600,
  retryBackoffMs: 30_000,
  retryBackoffMaxMs: 600_000,
  display: { width: 1280, height: 800 },
  screenshot: { maxDimension: 1280, format: 'jpeg' },
} as const;

export const computerDocument = defineDoc<ComputerRecord>({
  kind: 'bots.computer',
  version: 1,
  scope: 'session',
  initial: () => ({
    taskId: null,
    state: 'off',
    startedAt: null,
    lastActivityAt: null,
    sleptAt: null,
    control: null,
    handoff: null,
  }),
  checkpointWhen: () => false,
});
