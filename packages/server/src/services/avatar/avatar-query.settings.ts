import { avatarSettings } from '@repo/contracts/universal';
import { AVATAR_GENERATE } from './avatar.constants';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarSettings } from '@repo/contracts/universal';

export async function avatarQuerySettings({ settings }: AvatarServiceDeps): Promise<AvatarSettings> {
  const records = await settings.queries.get({ keys: [AVATAR_GENERATE.urlSetting] });

  return { generatorUrl: avatarSettings.shape.generatorUrl.catch(AVATAR_GENERATE.defaultUrl).parse(records.at(0)?.value) };
}
