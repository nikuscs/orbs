import { z } from 'zod';
import type { DaemonSkillsListMessage } from '@orbs/server/daemon';

export interface SkillServiceDeps {
  sharedHome: string;
}

export type SkillQueryListParams = Omit<DaemonSkillsListMessage, 'type' | 'requestId'>;

export const skillFile = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export type SkillFile = z.infer<typeof skillFile>;
