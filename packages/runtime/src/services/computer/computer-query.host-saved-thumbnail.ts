import { readFile, stat } from 'node:fs/promises';
import { match } from 'ts-pattern';
import { computerHostPaths } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostSavedThumbnail(
  runtime: HostTypes.ComputerHostRuntime,
  { botId }: ComputerTypes.ComputerBotParams,
): Promise<ComputerTypes.ComputerThumbnailFile | null> {
  const { thumbnailFile } = computerHostPaths(runtime, botId);

  try {
    const [data, info] = await Promise.all([
      readFile(thumbnailFile),
      stat(thumbnailFile),
    ]);

    return { data: data.toString('base64'), mimeType: 'image/jpeg', takenAt: Math.floor(info.mtimeMs) };
  } catch (error) {
    return match(error)
      .with({ code: 'ENOENT' }, () => null)
      .otherwise(() => {
        throw error;
      });
  }
}
