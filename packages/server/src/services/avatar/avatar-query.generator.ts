import { avatarImageModel } from './avatar.utils';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarGenerator } from '@repo/contracts/universal';

export async function avatarQueryGenerator(deps: AvatarServiceDeps): Promise<AvatarGenerator> {
  const model = await avatarImageModel(deps);

  return { model: model?.name ?? null };
}
