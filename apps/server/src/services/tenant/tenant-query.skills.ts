import { Errors } from '@orbs/errors/universal';
import type { DaemonSkill } from '#/types/daemon.types';
import type { TenantQuerySkillsParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQuerySkills(deps: TenantServiceDeps, params: TenantQuerySkillsParams): Promise<DaemonSkill[]> {
  const bot = await deps.bot.queries.get({ organizationId: params.organizationId, botId: params.botId });

  if (!bot) {
    throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: params.botId });
  }

  const skills = await deps.namespace.getByName(params.organizationId).daemonSkills({ homeDir: bot.homeDir, inherit: bot.inherit });

  if (!skills) {
    throw new Errors.NOT_FOUND({ resource: 'daemon' });
  }

  return skills;
}
