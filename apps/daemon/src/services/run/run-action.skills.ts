import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonSkillsListMessage } from '@orbs/server/daemon';

export async function runActionSkills(deps: RunServiceDeps, params: DaemonSkillsListMessage): Promise<void> {
  const skills = await deps.skill.queries.list({ homeDir: params.homeDir, inherit: params.inherit });

  deps.connection.actions.send({
    type: 'skills.listed',
    requestId: params.requestId,
    skills,
  });
}
