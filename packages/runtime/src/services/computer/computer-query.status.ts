import { computerDocument } from './computer.constants';
import { computerControlActive, computerSchedule } from './computer.utils';
import type { ComputerContextParams, ComputerServiceDeps } from '../../types/computer.types';
import type { ComputerStatus } from '@repo/contracts/universal';

export async function computerQueryStatus({ harness, host, botId }: ComputerServiceDeps, { context }: ComputerContextParams): Promise<ComputerStatus> {
  const now = Date.now();

  const [stored, state, thumbnail] = await Promise.all([
    harness.snapshot(computerDocument, context),
    host.queries.state({ botId }),
    host.queries.savedThumbnail({ botId }),
  ]);

  const record = stored?.state === state ? stored : null;
  const schedule = record ? computerSchedule(record, now) : null;

  return {
    botId,
    state,
    startedAt: record?.startedAt ?? null,
    lastActivityAt: record?.lastActivityAt ?? null,
    sleepsAt: schedule?.sleepAt ?? null,
    shutsDownAt: schedule?.shutdownAt ?? null,
    control: record ? computerControlActive(record, now) : null,
    thumbnailAt: thumbnail?.takenAt ?? null,
  };
}
