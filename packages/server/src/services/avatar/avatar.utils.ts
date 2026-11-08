import { AVATAR } from '@repo/contracts/universal';
import { Errors } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { AVATAR_IMAGE } from './avatar.constants';

export function avatarSrc(imageId: string) {
  return `${AVATAR.pathPrefix}${imageId}${AVATAR_IMAGE.extension}`;
}

export function avatarImageIdFromSrc(src: string) {
  return src.slice(AVATAR.pathPrefix.length, -AVATAR_IMAGE.extension.length);
}

export function avatarUnavailable(message: string): never {
  log.warn({ tag: 'avatar', message });

  throw new Errors.UPSTREAM_UNAVAILABLE({ internal: message });
}
