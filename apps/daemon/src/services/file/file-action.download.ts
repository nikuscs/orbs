import { Errors } from '@orbs/errors/universal';
import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { skillResolveHome } from '#services/skill/skill.utils';
import { TENANT } from '@orbs/server/daemon';
import type { FileActionDownloadParams, FileServiceDeps } from '#/types/file.types';

export async function fileActionDownload(deps: FileServiceDeps, params: FileActionDownloadParams): Promise<void> {
  params.signal.throwIfAborted();
  const target = skillResolveHome(params.file.path);

  if ((await stat(target).catch(() => null))?.size === params.file.size) {
    return;
  }

  const response = await fetch(new URL(`${TENANT.filePath}${params.file.id}`, deps.env.ORBS_URL), {
    headers: { [TENANT.daemonKeyHeader]: deps.env.ORBS_API_KEY },
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Errors.NOT_FOUND({ resource: 'file', resourceId: params.file.id });
  }

  const bytes = await response.arrayBuffer();

  params.signal.throwIfAborted();
  await mkdir(dirname(target), { recursive: true });
  params.signal.throwIfAborted();
  await Bun.write(target, bytes);
  params.signal.throwIfAborted();
}
