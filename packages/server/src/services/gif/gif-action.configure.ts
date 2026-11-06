import { GIF_SERVICE } from './gif.constants';
import type { GifConfigureParams, GifServiceDeps } from '../../types/gif.types';

export async function gifActionConfigure({ settings }: GifServiceDeps, { provider }: GifConfigureParams) {
  await settings.actions.set({ records: [{ key: GIF_SERVICE.providerSetting, value: provider }] });
}
