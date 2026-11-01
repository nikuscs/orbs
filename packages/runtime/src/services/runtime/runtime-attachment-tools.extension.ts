import { defineExtension, defineTool } from '@earendil-works/pi-durable';
import { ATTACHMENT } from '@repo/contracts/universal';
import * as m from '@repo/i18n/messages';
import { runtimeAttachmentToolsSend, runtimeAttachmentToolsSendParameters } from '../../types/runtime-attachment-tools.types';
import { runtimeToolTarget } from './runtime-tool.utils';
import type { RuntimeAttachmentToolsRegisterParams } from '../../types/runtime-attachment-tools.types';

export function runtimeAttachmentToolsExtension({ attachments }: RuntimeAttachmentToolsRegisterParams) {
  const send = defineTool({
    name: ATTACHMENT.sendToolName,
    description: m.ui_tool_bot_send_file_description({ maxMb: ATTACHMENT.sendMaxBytes / 1024 / 1024, types: Object.keys(ATTACHMENT.sendTypes).join(', ') }),
    parameters: runtimeAttachmentToolsSendParameters,
    replay: 'unsafe',
    execute: async (params, api, context) => {
      const input = runtimeAttachmentToolsSend.parse(params);
      const { botId } = await runtimeToolTarget(api, context);
      const attachment = await attachments.actions.send({ botId, path: input.path });

      return {
        output: [{ type: 'text' as const, text: m.ui_tool_bot_send_file_sent({ name: attachment.name }) }],
        details: { attachment },
      };
    },
  });

  return defineExtension({ name: 'bots.attachment-tools', tools: [send] });
}
