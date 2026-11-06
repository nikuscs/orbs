import { computerHostSaveThumbnail } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export function computerActionHostThumbnail(
  runtime: HostTypes.ComputerHostRuntime,
  { botId }: ComputerTypes.ComputerBotParams,
): Promise<ComputerTypes.ComputerThumbnailFile | null> {
  return computerHostSaveThumbnail(runtime, botId);
}
