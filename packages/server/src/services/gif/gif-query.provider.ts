import { gifProvider } from '@repo/contracts/universal';
import { GIF_SERVICE } from './gif.constants';
import type { GifServiceDeps } from '../../types/gif.types';

export async function gifQueryProvider({ settings }: GifServiceDeps) {
  const records = await settings.queries.get({ keys: [GIF_SERVICE.providerSetting] });

  return gifProvider.catch(GIF_SERVICE.defaultProvider).parse(records.at(0)?.value);
}
