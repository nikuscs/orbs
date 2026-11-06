import type { ComputerServiceDeps, ComputerViewerParams } from '../../types/computer.types';
import type { ComputerViewerResult } from '@repo/contracts/universal';

export async function computerActionViewer(
  { bots, runtime }: ComputerServiceDeps,
  { botId, mode, device }: ComputerViewerParams,
): Promise<ComputerViewerResult> {
  await bots.actions.configure({ botId });

  const { viewerPath, expiresAt } = await runtime.actions.computerViewer({
    botId,
    mode,
    principal: { id: device.id, displayName: device.name },
  });

  return { url: `/computers/${botId}${viewerPath}`, expiresAt };
}
