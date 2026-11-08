import { avatarActionProbe } from './avatar-action.probe';
import { AVATAR_GENERATE } from './avatar.constants';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarConfigureInput } from '@repo/contracts/universal';

export async function avatarActionConfigure(deps: AvatarServiceDeps, { generatorUrl }: AvatarConfigureInput) {
  await deps.settings.actions.set({ records: generatorUrl ? [{ key: AVATAR_GENERATE.urlSetting, value: generatorUrl }] : [] });

  return avatarActionProbe(deps);
}
