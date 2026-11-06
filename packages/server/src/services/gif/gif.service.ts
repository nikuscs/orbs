import { gifActionConfigure } from './gif-action.configure';
import { gifActionPick } from './gif-action.pick';
import { gifQueryProvider } from './gif-query.provider';
import type { GifConfigureParams, GifPickParams, GifServiceDeps } from '../../types/gif.types';

export function makeGifService(deps: GifServiceDeps) {
  return {
    actions: {
      configure: (params: GifConfigureParams) => gifActionConfigure(deps, params),
      pick: (params: GifPickParams) => gifActionPick(deps, params),
    },
    queries: {
      provider: () => gifQueryProvider(deps),
    },
  };
}

export type GifService = ReturnType<typeof makeGifService>;
