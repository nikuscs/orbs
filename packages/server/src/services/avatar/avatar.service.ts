import { avatarActionGenerate } from './avatar-action.generate';
import { avatarActionUpload } from './avatar-action.upload';
import { avatarQueryBot } from './avatar-query.bot';
import { avatarQueryGenerator } from './avatar-query.generator';
import type { AvatarImageParams, AvatarServiceDeps } from '../../types/avatar.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeAvatarService(deps: AvatarServiceDeps) {
  return {
    actions: {
      generate: (params: UniversalTypes.AvatarGenerateInput) => avatarActionGenerate(deps, params),
      upload: (params: UniversalTypes.AvatarUploadInput) => avatarActionUpload(deps, params),
    },
    queries: {
      image: (params: AvatarImageParams) => deps.images.queries.read(params),
      generator: () => avatarQueryGenerator(deps),
      bot: (params: UniversalTypes.BotGetInput) => avatarQueryBot(deps, params),
    },
  };
}

export type AvatarService = ReturnType<typeof makeAvatarService>;
