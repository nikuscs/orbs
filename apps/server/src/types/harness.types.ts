import type { BotInheritResource } from '#/types/bot.types';
import type * as DaemonTypes from '#/types/daemon.types';
import type { DatabaseTenant } from '#/types/database-tenant.types';
import type { TenantSockets } from '#/types/tenant.types';
import type { RunService } from '#services/run/run.service';

export interface HarnessServiceDeps {
  database: DatabaseTenant;
  sockets: TenantSockets;
  run: Pick<RunService, 'actions'>;
  skillRequests: Map<string, (skills: DaemonTypes.DaemonSkill[]) => void>;
  modelRequests: Map<string, (providers: DaemonTypes.DaemonProvider[]) => void>;
}

export interface HarnessActionListModelsParams {
  harnessId: string;
}

export type HarnessActionModelsListedParams = Omit<DaemonTypes.DaemonModelsListedMessage, 'type'>;

export interface HarnessActionSaveParams {
  harnesses: DaemonTypes.DaemonHarness[];
}

export interface HarnessActionListSkillsParams {
  homeDir: string;
  inherit: BotInheritResource[];
}

export type HarnessActionSkillsListedParams = Omit<DaemonTypes.DaemonSkillsListedMessage, 'type'>;

export type HarnessActionReadyParams = HarnessActionSaveParams;

export type HarnessActionRefuseParams = DaemonTypes.DaemonHandshake;

export interface HarnessActionClosedParams {
  othersOpen: boolean;
}
