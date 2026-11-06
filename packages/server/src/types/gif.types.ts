import type { SettingsService } from '../services/settings/settings.service';
import type { GifProvider, GifReaction } from '@repo/contracts/universal';

export interface GifServiceDeps {
  settings: SettingsService;
}

export interface GifConfigureParams {
  provider: GifProvider;
}

export interface GifPickParams {
  reaction: GifReaction;
}
