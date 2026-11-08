import { match, P } from 'ts-pattern';
import { avatarGenerateResponse } from '../../types/avatar.types';
import { avatarActionSweep } from './avatar-action.sweep';
import { avatarQuerySettings } from './avatar-query.settings';
import { AVATAR_GENERATE } from './avatar.constants';
import { avatarGeneratorUrl, avatarSrc, avatarUnavailable } from './avatar.utils';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarGenerateInput, BotAvatarImage } from '@repo/contracts/universal';

export async function avatarActionGenerate(deps: AvatarServiceDeps, { description }: AvatarGenerateInput): Promise<BotAvatarImage> {
  await avatarActionSweep(deps);

  const { generatorUrl } = await avatarQuerySettings(deps);

  const response = await fetch(avatarGeneratorUrl(generatorUrl, AVATAR_GENERATE.path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      prompt: `${description}, ${AVATAR_GENERATE.styleSuffix}`,
      negative_prompt: AVATAR_GENERATE.negativePrompt,
      width: AVATAR_GENERATE.size,
      height: AVATAR_GENERATE.size,
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(AVATAR_GENERATE.timeoutMs),
  }).catch(() => null);

  if (!response) {
    avatarUnavailable('Image generator could not be reached');
  }

  if (!response.ok) {
    avatarUnavailable(`Image generator failed with status ${response.status}`);
  }

  const body = avatarGenerateResponse.safeParse(await response.json().catch(() => null));

  if (!body.success) {
    avatarUnavailable('Image generator returned an unexpected response');
  }

  const base64 = body.data.images[0]?.replace(/^data:[^,]*,/, '') ?? '';
  const bytes = Buffer.from(base64, 'base64');

  const imageId = await deps.images.actions.save({ file: new File([bytes], 'avatar.png', { type: 'image/png' }) }).catch((error: unknown) =>
    match(error)
      .with({ syscall: P.string }, () => {
        throw error;
      })
      .otherwise(() => avatarUnavailable('Image generator returned an unusable image', error)));

  return { kind: 'image', src: avatarSrc(imageId) };
}
