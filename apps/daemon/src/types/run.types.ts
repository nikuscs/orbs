import type { HarnessAdapter } from '#/types/harness.types';
import type { ConnectionService } from '#services/connection/connection.service';
import type { FileService } from '#services/file/file.service';
import type { HarnessService } from '#services/harness/harness.service';
import type { McpInternalService } from '#services/mcp-internal/mcp-internal.service';
import type { SkillService } from '#services/skill/skill.service';

export interface RunTurn {
  adapter: HarnessAdapter | null;
  controller: AbortController;
  roomId: string;
  downloading: boolean;
  deleted: boolean;
}

export type RunTurns = Map<string, RunTurn>;

export interface RunServiceDeps {
  mcpInternal: McpInternalService;
  harness: Pick<HarnessService, 'queries' | 'actions'>;
  connection: Pick<ConnectionService, 'actions'>;
  skill: Pick<SkillService, 'queries'>;
  file: Pick<FileService, 'actions'>;
  turns: RunTurns;
}

