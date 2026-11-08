import { AVATAR } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { AVATAR_IMAGE } from './avatar.constants';
import type { AvatarServiceDeps } from '../../types/avatar.types';

export function avatarSrc(imageId: string) {
  return `${AVATAR.pathPrefix}${imageId}${AVATAR_IMAGE.extension}`;
}

export function avatarImageIdFromSrc(src: string) {
  return src.slice(AVATAR.pathPrefix.length, -AVATAR_IMAGE.extension.length);
}

export async function avatarImageModel({ providers }: Pick<AvatarServiceDeps, 'providers'>) {
  const models = await providers.models.getAvailableOfType('image');

  return models.at(0);
}

export function avatarUnavailable(message: string, cause?: ErrorOptions['cause']): never {
  log.warn({
    tag: 'avatar',
    message,
    error: cause,
  });

  throw new Errors.UPSTREAM_UNAVAILABLE({ internal: message, cause });
}
