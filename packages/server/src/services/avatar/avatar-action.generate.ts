import { AVATAR } from '@repo/contracts/universal';
import { match, P } from 'ts-pattern';
import { avatarActionSweep } from './avatar-action.sweep';
import { AVATAR_GENERATE } from './avatar.constants';
import { avatarImageModel, avatarSrc, avatarUnavailable } from './avatar.utils';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarGenerateInput, BotAvatarImage } from '@repo/contracts/universal';

export async function avatarActionGenerate(deps: AvatarServiceDeps, { description }: AvatarGenerateInput): Promise<BotAvatarImage> {
  await avatarActionSweep(deps);

  const model = await avatarImageModel(deps);

  if (!model) {
    avatarUnavailable('No image model is available');
  }

  const result = await deps.providers.models.generateImages(
    model,
    { input: [{ type: 'text', text: `${AVATAR_GENERATE.prompt} ${description}. ${AVATAR_GENERATE.style}` }] },
    { signal: AbortSignal.timeout(AVATAR_GENERATE.timeoutMs) },
  );

  const image = result.output.flatMap((content) => (content.type === 'image' ? [content] : [])).at(0);

  if (result.stopReason !== 'stop' || !image) {
    avatarUnavailable(result.errorMessage ?? `${model.id} returned no image`);
  }

  if (!AVATAR.mediaTypes.some((mediaType) => mediaType === image.mimeType)) {
    avatarUnavailable(`${model.id} returned ${image.mimeType}`);
  }

  const file = new File([Buffer.from(image.data, 'base64')], 'avatar', { type: image.mimeType });

  const imageId = await deps.images.actions.save({ file }).catch((error: unknown) =>
    match(error)
      .with({ syscall: P.string }, () => {
        throw error;
      })
      .otherwise(() => avatarUnavailable(`${model.id} returned an unusable image`, error)));

  return { kind: 'image', src: avatarSrc(imageId) };
}
