import type { ConnectionService } from '#services/connection/connection.service';
import type { FileService } from '#services/file/file.service';
import type { HarnessService } from '#services/harness/harness.service';
import type { McpInternalService } from '#services/mcp-internal/mcp-internal.service';
import type { PiService } from '#services/pi/pi.service';
import type { RunService } from '#services/run/run.service';
import type { SkillService } from '#services/skill/skill.service';
import type { EnvDaemon } from '@orbs/env/daemon';

export interface DaemonServices {
  mcpInternal: McpInternalService;
  env: EnvDaemon;
  pi: PiService;
  harness: HarnessService;
  connection: ConnectionService;
  skill: SkillService;
  file: FileService;
  run: RunService;
}
