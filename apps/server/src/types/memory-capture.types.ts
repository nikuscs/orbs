import { z } from 'zod';
import type { MemoryStateService } from '#services/memory-state/memory-state.service';
import type { OrganizationService } from '#services/organization/organization.service';
import type { DaemonMemoryRequest } from './daemon.types';
import type { MemoryStateServiceDeps } from './memory-state.types';

export interface MemoryCaptureServiceDeps extends Omit<MemoryStateServiceDeps, 'render' | 'bots'> {
  memoryState: MemoryStateService;
  instructions: (captureFacts?: boolean) => string;
  organization: Pick<OrganizationService, 'queries'>;
}

export const memoryCaptureSkipped = z.array(
  z.object({
    from: z.int(),
    through: z.int(),
    reason: z.string().nullable(),
  }),
);

export const memoryCaptureControlInput = z.object({ roomId: z.string(), action: z.enum(['enable', 'disable', 'retry', 'skip']) });
export type MemoryCaptureControlInput = z.infer<typeof memoryCaptureControlInput>;
export const memoryCaptureStatusInput = z.object({ roomId: z.string() });
export type MemoryCaptureQueryStatusParams = z.infer<typeof memoryCaptureStatusInput>;
export interface MemoryCaptureActionFailParams {
  roomId: string;
  error: string;
}

export interface MemoryCaptureActionDispatchParams { request: DaemonMemoryRequest; useful: boolean }
