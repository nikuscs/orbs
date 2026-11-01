import { Errors } from '@repo/errors/universal';
import { match } from 'ts-pattern';
import { runtimeAttachmentToolsExtension } from './runtime-attachment-tools.extension';
import type { RuntimeAttachmentToolsRegisterDeps, RuntimeAttachmentToolsRegisterParams } from '../../types/runtime-attachment-tools.types';

export function runtimeActionRegisterAttachmentTools(deps: RuntimeAttachmentToolsRegisterDeps, params: RuntimeAttachmentToolsRegisterParams) {
  match(deps.extensions.some((extension) => extension.name === 'bots.attachment-tools'))
    .with(true, () => {
      throw new Errors.INTERNAL_ERROR({ internal: 'Attachment tools are already registered.' });
    })
    .with(false, () => undefined)
    .exhaustive();

  deps.extensions.push(runtimeAttachmentToolsExtension(params));
}
