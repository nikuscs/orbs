import { HARNESS } from './harness.constants';
import type { DaemonSkill } from '#/types/daemon.types';
import type { HarnessActionListSkillsParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionListSkills(deps: HarnessServiceDeps, params: HarnessActionListSkillsParams): Promise<DaemonSkill[] | null> {
  const daemon = deps.sockets.daemon();

  if (!daemon) {
    return Promise.resolve(null);
  }

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      deps.skillRequests.delete(requestId);
      resolve(null);
    }, HARNESS.skillsTimeoutMs);

    deps.skillRequests.set(requestId, (skills) => {
      clearTimeout(timer);
      resolve(skills);
    });
    daemon.send({
      type: 'skills.list',
      requestId,
      homeDir: params.homeDir,
      inherit: params.inherit,
    });
  });
}
