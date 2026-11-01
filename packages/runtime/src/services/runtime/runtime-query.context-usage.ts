import { calculateContextTokens, estimateMessageTokens } from '@earendil-works/pi-ai/utils/estimate';
import { DEFAULT_COMPACTION_POLICY } from '@earendil-works/pi-durable';
import { match, P } from 'ts-pattern';
import { runtimeQueryConversation } from './runtime-query.conversation';
import type { RuntimeContextInput, RuntimeConversationParams, RuntimeServiceDeps } from '../../types/runtime.types';
import type { AssistantMessage } from '@earendil-works/pi-ai';
import type { ContextView } from '@earendil-works/pi-durable';

export async function runtimeQueryContextUsage(
  deps: RuntimeServiceDeps,
  params: RuntimeConversationParams & RuntimeContextInput,
) {
  function runtimeContextUsageTokens(view: ContextView) {
    const after = view.head?.id ?? Number.NEGATIVE_INFINITY;
    let measured: AssistantMessage | undefined;

    for (let index = view.entries.length - 1; index >= 0 && measured === undefined; index -= 1) {
      measured = match(view.entries[index].id > after)
        .with(true, () => [...view.contributions[index]].reverse().find((message): message is AssistantMessage => (
          message.role === 'assistant' && calculateContextTokens(message.usage) > 0
        )))
        .otherwise(() => undefined);
    }

    const { startIndex, usageTokens } = match(measured)
      .with(P.nonNullable, (message) => ({
        startIndex: view.messages.lastIndexOf(message) + 1,
        usageTokens: calculateContextTokens(message.usage),
      }))
      .otherwise(() => ({ startIndex: 0, usageTokens: 0 }));

    return view.messages.slice(startIndex).reduce(
      (tokens, message) => tokens + estimateMessageTokens(message),
      usageTokens,
    );
  }

  const { context } = params;
  const conversation = await runtimeQueryConversation(deps, params);
  const agent = await conversation.agent(context);
  const view = await conversation.context(context);

  const model = match(agent.model)
    .with(P.nonNullable, ({ provider, modelId }) => deps.models.getModel(provider, modelId))
    .otherwise(() => undefined);

  const transcriptTokens = view.messages.reduce((tokens, message) => tokens + estimateMessageTokens(message), 0);

  return {
    contextWindow: match(model?.contextWindow)
      .with(P.number.positive(), (value) => value)
      .otherwise(() => null),
    estimatedTokens: runtimeContextUsageTokens(view),
    compactable: transcriptTokens > DEFAULT_COMPACTION_POLICY.keepRecentTokens,
  };
}
