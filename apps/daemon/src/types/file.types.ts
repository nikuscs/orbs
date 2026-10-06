import type { EnvDaemon } from '@orbs/env/daemon';
import type { DaemonStartFile } from '@orbs/server/daemon';

export interface FileServiceDeps {
  env: Pick<EnvDaemon, 'ORBS_URL' | 'ORBS_API_KEY'>;
}

export interface FileActionDownloadParams {
  file: DaemonStartFile;
  signal: AbortSignal;
}

export interface FileActionRemoveRoomParams {
  roomId: string;
}

export interface FileActionPruneParams {
  roomIds: string[];
}
