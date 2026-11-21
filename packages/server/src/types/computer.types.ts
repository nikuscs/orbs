import type { BotService } from '../services/bot/bot.service';
import type { ComputerViewerMode } from '@repo/contracts/universal';
import type { RuntimeService } from '@repo/runtime/server';

export interface ComputerServiceDeps {
  bots: BotService;
  runtime: RuntimeService;
}

export interface ComputerReleaseParams {
  botId: string;
  deviceId: string;
}

export interface ComputerViewerParams {
  botId: string;
  mode: ComputerViewerMode;
  isRenewal?: boolean;
  device: { id: string; name: string };
}
