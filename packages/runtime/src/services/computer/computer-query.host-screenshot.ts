import { computerHostCapture, computerHostSession } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostScreenshot(
  runtime: HostTypes.ComputerHostRuntime,
  { botId, format, maxDimension, windowId }: ComputerTypes.ComputerScreenshotParams,
): Promise<ComputerTypes.ComputerImage> {
  const session = await computerHostSession(runtime, botId);

  return computerHostCapture(session, {
    format,
    maxDimension,
    windowId,
  });
}
