import { log } from '@orbs/logger/server';
import { TENANT } from '#services/tenant/tenant.constants';
import { harnessActionSave } from './harness-action.save';
import { harnessQueryList } from './harness-query.list';
import type { DaemonHarnessProblem } from '#/types/daemon.types';
import type { HarnessActionRefuseParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionRefuse(deps: HarnessServiceDeps, params: HarnessActionRefuseParams): void {
  const protocol = params.protocol ?? null;
  const problem: DaemonHarnessProblem = { code: 'daemon_protocol', protocol, required: TENANT.daemonProtocol };
  const alreadyRefused = harnessQueryList(deps).some((harness) => harness.problem?.code === 'daemon_protocol' && harness.problem.protocol === protocol);

  if (alreadyRefused) {
    return;
  }

  log.error({
    tag: 'tenant',
    message: `daemon refused: it speaks protocol ${protocol ?? 'none'} and this server needs protocol ${TENANT.daemonProtocol}; update the older one`,
  });

  harnessActionSave(deps, {
    harnesses: params.harnesses.map((harness) => ({
      harnessId: harness.harnessId,
      providers: [],
      problem,
    })),
  });
}
