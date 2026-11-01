import type { ConversationServiceDeps } from '../../types/conversation.types';
import type { CommandExecuteInput } from '@repo/contracts/universal';

export async function conversationActionExecuteCommand({ runtime, bots }: ConversationServiceDeps, params: CommandExecuteInput) {
  await bots.queries.get({ botId: params.botId });
  return runtime.actions.executeCommand(params);
}
