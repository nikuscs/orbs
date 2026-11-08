import { avatarActionConfigure } from './avatar-action.configure';
import { avatarActionGenerate } from './avatar-action.generate';
import { avatarActionProbe } from './avatar-action.probe';
import { avatarActionUpload } from './avatar-action.upload';
import { avatarQueryBot } from './avatar-query.bot';
import { avatarQuerySettings } from './avatar-query.settings';
import type { AvatarImageParams, AvatarServiceDeps } from '../../types/avatar.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeAvatarService(deps: AvatarServiceDeps) {
  return {
    actions: {
      configure: (params: UniversalTypes.AvatarConfigureInput) => avatarActionConfigure(deps, params),
      generate: (params: UniversalTypes.AvatarGenerateInput) => avatarActionGenerate(deps, params),
      probe: () => avatarActionProbe(deps),
      upload: (params: UniversalTypes.AvatarUploadInput) => avatarActionUpload(deps, params),
    },
    queries: {
      image: (params: AvatarImageParams) => deps.images.queries.read(params),
      settings: () => avatarQuerySettings(deps),
      bot: (params: UniversalTypes.BotGetInput) => avatarQueryBot(deps, params),
    },
  };
}

export type AvatarService = ReturnType<typeof makeAvatarService>;
