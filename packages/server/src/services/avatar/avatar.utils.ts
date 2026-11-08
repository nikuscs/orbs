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

export function avatarGeneratorUrl(generatorUrl: string, path: string) {
  return new URL(path, generatorUrl.endsWith('/') ? generatorUrl : `${generatorUrl}/`);
}

export function avatarUnavailable(message: string, cause?: ErrorOptions['cause']): never {
  log.warn({
    tag: 'avatar',
    message,
    error: cause,
  });

  throw new Errors.UPSTREAM_UNAVAILABLE({ internal: message, cause });
}
