import { avatarOptionsResponse } from '../../types/avatar.types';
import { avatarQuerySettings } from './avatar-query.settings';
import { AVATAR_GENERATE } from './avatar.constants';
import { avatarGeneratorUrl } from './avatar.utils';
import type { AvatarServiceDeps } from '../../types/avatar.types';
import type { AvatarStatus } from '@repo/contracts/universal';

export async function avatarActionProbe(deps: AvatarServiceDeps): Promise<AvatarStatus> {
  const { generatorUrl } = await avatarQuerySettings(deps);

  const response = await fetch(avatarGeneratorUrl(generatorUrl, AVATAR_GENERATE.optionsPath), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(AVATAR_GENERATE.probeTimeoutMs),
  }).catch(() => null);

  if (!response?.ok) {
    return { generatorUrl, isAvailable: false, model: null };
  }

  const body = avatarOptionsResponse.safeParse(await response.json().catch(() => null));

  if (!body.success) {
    return { generatorUrl, isAvailable: false, model: null };
  }

  return { generatorUrl, isAvailable: true, model: body.data.sd_model_checkpoint };
}
