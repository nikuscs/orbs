import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeConnectionService } from '#services/connection/connection.service';
import { makeFileService } from '#services/file/file.service';
import { makeHarnessService } from '#services/harness/harness.service';
import { makeMcpInternalService } from '#services/mcp-internal/mcp-internal.service';
import { PI } from '#services/pi/pi.constants';
import { makePiService } from '#services/pi/pi.service';
import { makeRunService } from '#services/run/run.service';
import { makeSkillService } from '#services/skill/skill.service';
import { skillResolveHome } from '#services/skill/skill.utils';
import { BOT, createContainer } from '@orbs/server/daemon';
import type { DaemonServices } from '#/types/daemon.types';
import type { PiProcessEnv } from '#/types/pi.types';
import type { EnvDaemon } from '@orbs/env/daemon';
import type { Factories } from '@orbs/server/daemon';

export function makeDaemonServices(env: EnvDaemon, processEnv: PiProcessEnv, overrides?: Partial<Factories<DaemonServices>>): DaemonServices {
  return createContainer<DaemonServices>({
    env: () => env,
    pi: (services) => makePiService({
      workdir: services.env.ORBS_WORKDIR,
      sharedHome: services.env.ORBS_SHARED_HOME,
      userAgentDir: skillResolveHome(processEnv[PI.agentDirEnv] ?? join(homedir(), ...PI.userAgentDir)),
      processEnv,
      tempFiles: { dir: join(tmpdir(), `${PI.tempDirPrefix}-${process.pid}`), bridgeWritten: null },
      versionCheck: { problem: null },
      turns: new Map(),
      sessions: new Map(),
      judging: new Map(),
    }),
    harness: (services) => makeHarnessService({ adapters: new Map([[BOT.harnessId, services.pi.actions]]) }),
    connection: (services) => makeConnectionService({
      env: services.env,
      harness: services.harness,
      socket: { current: undefined, closed: false },
    }),
    mcpInternal: (services) => makeMcpInternalService({
      connection: services.connection,
      state: { server: undefined, secret: crypto.randomUUID(), runs: new Map(), pending: new Map() },
    }),
    skill: (services) => makeSkillService({ sharedHome: services.env.ORBS_SHARED_HOME }),
    file: (services) => makeFileService({ env: services.env }),
    run: (services) => makeRunService({
      harness: services.harness,
      connection: services.connection,
      skill: services.skill,
      file: services.file,
      mcpInternal: services.mcpInternal,
      turns: new Map(),
    }),
  }, overrides);
}
