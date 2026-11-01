import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { createToolSearchExtension } from '@earendil-works/pi-durable/tool-search';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import { artifactBlocksCatalog } from '../artifact/artifact-blocks.utils';
import { makeCollaborationExtensionService } from '../collaboration/collaboration-extension.service';
import { notificationItemKey, notificationRecentAppend } from '../notification/notification.utils';
import { makeQuestionExtensionService } from '../question/question-extension.service';
import { makeRoutineExtensionService } from '../routine/routine-extension.service';
import { makeSubagentExtensionService } from '../subagent/subagent-extension.service';
import { makeTodoExtensionService } from '../todo/todo-extension.service';
import { runtimeActionAddAttachment } from './runtime-action.add-attachment';
import { runtimeActionAnswerQuestion } from './runtime-action.answer-question';
import { runtimeActionApprove } from './runtime-action.approve';
import { runtimeActionCarryOver } from './runtime-action.carry-over';
import { runtimeActionConfigureBot } from './runtime-action.configure-bot';
import { runtimeActionCreateArtifact } from './runtime-action.create-artifact';
import { runtimeActionCreateRoutine } from './runtime-action.create-routine';
import { runtimeActionCreateTodo } from './runtime-action.create-todo';
import { runtimeActionExecuteCommand } from './runtime-action.execute-command';
import { runtimeActionExpireAttachments } from './runtime-action.expire-attachments';
import { runtimeActionRegisterAttachmentTools } from './runtime-action.register-attachment-tools';
import { runtimeActionRegisterBotTools } from './runtime-action.register-bot-tools';
import { runtimeActionRemoveAttachment } from './runtime-action.remove-attachment';
import { runtimeActionRemoveRoutine } from './runtime-action.remove-routine';
import { runtimeActionRemoveTodo } from './runtime-action.remove-todo';
import { runtimeActionReorderTodos } from './runtime-action.reorder-todos';
import { runtimeActionRestoreArtifact } from './runtime-action.restore-artifact';
import { runtimeActionRetainAttachments } from './runtime-action.retain-attachments';
import { runtimeActionRunRoutine } from './runtime-action.run-routine';
import { runtimeActionSaveArtifactState } from './runtime-action.save-artifact-state';
import { runtimeActionSetReaction } from './runtime-action.set-reaction';
import { runtimeActionSubmit } from './runtime-action.submit';
import { runtimeActionUpdateArtifact } from './runtime-action.update-artifact';
import { runtimeActionUpdateRoutine } from './runtime-action.update-routine';
import { runtimeActionUpdateSubmission } from './runtime-action.update-submission';
import { runtimeActionUpdateTodo } from './runtime-action.update-todo';
import { runtimeBotCall, runtimeBotOpen } from './runtime-bot.utils';
import { runtimeChatToolsExtension } from './runtime-chat-tools.extension';
import { runtimeCodingToolsExtension } from './runtime-coding-tools.extension';
import { runtimeDirectory } from './runtime-directory.utils';
import { runtimeModels } from './runtime-model.utils';
import { runtimeQueryActivity } from './runtime-query.activity';
import { runtimeQueryActivityRun } from './runtime-query.activity-run';
import { runtimeQueryApprovals } from './runtime-query.approvals';
import { runtimeQueryArtifact } from './runtime-query.artifact';
import { runtimeQueryArtifactVersions } from './runtime-query.artifact-versions';
import { runtimeQueryAttachment } from './runtime-query.attachment';
import { runtimeQueryAttachmentTarget } from './runtime-query.attachment-target';
import { runtimeQueryAttachments } from './runtime-query.attachments';
import { runtimeQueryBotUsage } from './runtime-query.bot-usage';
import { runtimeQueryCarry } from './runtime-query.carry';
import { runtimeQueryCommands } from './runtime-query.commands';
import { runtimeQueryContextUsage } from './runtime-query.context-usage';
import { runtimeQueryContexts } from './runtime-query.contexts';
import { runtimeQueryConversation } from './runtime-query.conversation';
import { runtimeQueryHasEntry } from './runtime-query.has-entry';
import { runtimeQueryHistory } from './runtime-query.history';
import { runtimeQueryListArtifacts } from './runtime-query.list-artifacts';
import { runtimeQueryListBotArtifacts } from './runtime-query.list-bot-artifacts';
import { runtimeQueryListRoutines } from './runtime-query.list-routines';
import { runtimeQueryListTodos } from './runtime-query.list-todos';
import { runtimeQueryModels } from './runtime-query.models';
import { runtimeQueryQuestions } from './runtime-query.questions';
import { runtimeQueryReactions } from './runtime-query.reactions';
import { runtimeQuerySearch } from './runtime-query.search';
import { runtimeQuerySubmission } from './runtime-query.submission';
import { runtimeQueryUsage } from './runtime-query.usage';
import { runtimeQueryValidateModel } from './runtime-query.validate-model';
import { runtimeQueryWatch } from './runtime-query.watch';
import { runtimeQueryWatchContexts } from './runtime-query.watch-contexts';
import { runtimeReactionExtension } from './runtime-reaction.extension';
import { runtimeSecretsExtension } from './runtime-secrets.extension';
import { runtimeSkillsExtension } from './runtime-skills.extension';
import { runtimeWatchMerge } from './runtime-watch-merge.utils';
import { RUNTIME_ALARM_HEARTBEAT_MS } from './runtime.constants';
import type { ConversationIndexSummary } from '../../types/conversation-index.types';
import type { RuntimeAttachmentToolsRegisterParams } from '../../types/runtime-attachment-tools.types';
import type { RuntimeBotToolsRegisterParams } from '../../types/runtime-bot-tools.types';
import type * as RuntimeTypes from '../../types/runtime.types';
import type { Context } from '@earendil-works/chord/context';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeRuntimeService({
  appName,
  storage,
  alarm,
  models: sourceModels,
  env,
  permissions,
  collaboration: policy,
  images,
  secrets,
  toolExtensions = [],
}: RuntimeTypes.RuntimeServiceParams) {
  const codingTools = runtimeCodingToolsExtension({ images, secrets });
  const readOnlyTools = codingTools.tools?.filter((tool) => tool.name === 'read') ?? [];
  const directory = runtimeDirectory({ open: (botId) => runtimeBotOpen(shared, botId) });
  const collaboration = makeCollaborationExtensionService({ policy, directory });
  const questions = makeQuestionExtensionService();
  const chatTools = runtimeChatToolsExtension();
  const toolSearch = createToolSearchExtension();
  const subagents = makeSubagentExtensionService();
  const routines = makeRoutineExtensionService();
  const todos = makeTodoExtensionService();

  const shared: RuntimeTypes.RuntimeSharedDeps = {
    appName,
    storage,
    alarm,
    models: runtimeModels(sourceModels),
    env,
    permissions,
    directory,
    extensions: [
      codingTools,
      runtimeSkillsExtension,
      collaboration.extension,
      questions.extension,
      chatTools.extension,
      subagents.extension,
      routines.extension,
      runtimeReactionExtension,
      todos.extension,
      toolSearch,
      ...(secrets ? [runtimeSecretsExtension({ secrets })] : []),
      ...toolExtensions,
    ],
    readOnlyTools: [
      ...readOnlyTools,
      ...collaboration.readOnlyTools,
      ...questions.readOnlyTools,
      ...chatTools.readOnlyTools,
      ...(toolSearch.tools ?? []),
    ],
    ownTools: [collaboration.extension, questions.extension, chatTools.extension, subagents.extension].flatMap((extension) => extension.tools ?? []),
  };

  const unlisten = alarm.listen(({ botId }) => {
    void directory.bot(botId).then((bot) => bot.wake()).catch((error: unknown) => {
      log.error({
        tag: 'runtime-alarm',
        message: 'Cannot wake a bot store.',
        botId,
        error,
      });
    });
  });

  const unlistenFailures = directory.onChange((change) => match(change)
    .with({ type: 'closed', isFailed: true }, ({ botId }) => alarm.set({ botId, at: Date.now() + RUNTIME_ALARM_HEARTBEAT_MS }))
    .otherwise(() => undefined));

  return {
    actions: {
      restoreArtifact: runtimeBotCall(directory, runtimeActionRestoreArtifact),
      saveArtifactState: runtimeBotCall(directory, runtimeActionSaveArtifactState),
      updateArtifact: runtimeBotCall(directory, runtimeActionUpdateArtifact),
      createArtifact: runtimeBotCall(directory, runtimeActionCreateArtifact),
      registerBotTools: (params: RuntimeBotToolsRegisterParams) => runtimeActionRegisterBotTools(shared, params),
      registerAttachmentTools: (params: RuntimeAttachmentToolsRegisterParams) => runtimeActionRegisterAttachmentTools(shared, params),
      removeRoutine: runtimeBotCall(directory, runtimeActionRemoveRoutine),
      runRoutine: runtimeBotCall(directory, runtimeActionRunRoutine),
      updateRoutine: runtimeBotCall(directory, runtimeActionUpdateRoutine),
      createRoutine: runtimeBotCall(directory, runtimeActionCreateRoutine),
      createTodo: runtimeBotCall(directory, runtimeActionCreateTodo),
      updateTodo: runtimeBotCall(directory, runtimeActionUpdateTodo),
      removeTodo: runtimeBotCall(directory, runtimeActionRemoveTodo),
      reorderTodos: runtimeBotCall(directory, runtimeActionReorderTodos),
      answerQuestion: runtimeBotCall(directory, runtimeActionAnswerQuestion),
      setReaction: runtimeBotCall(directory, runtimeActionSetReaction),
      executeCommand: runtimeBotCall(directory, runtimeActionExecuteCommand),
      approve: runtimeBotCall(directory, runtimeActionApprove),
      configureBot: async (bot: RuntimeTypes.RuntimeBotParams, context: Context = BACKGROUND_CONTEXT) => {
        directory.register(bot.id);
        const { deps } = await directory.bot(bot.id);
        const conversationId = await runtimeActionConfigureBot(deps, { ...bot, context });
        await runtimeActionCarryOver({ ...deps, storage }, { conversationId, context });

        return conversationId;
      },
      removeBot: async ({ botId }: UniversalTypes.BotGetInput) => {
        directory.unregister(botId);
        await directory.close(botId, () => storage.remove({ botId }));
      },
      clearBot: async ({ botId }: UniversalTypes.BotGetInput, context: Context = BACKGROUND_CONTEXT) => {
        const { deps } = await directory.bot(botId);
        await storage.saveCarry({ botId, carry: await runtimeQueryCarry(deps, context) });
        await directory.close(botId, () => storage.reset({ botId }));
      },
      submit: runtimeBotCall<RuntimeTypes.RuntimeSubmitParams, Awaited<ReturnType<typeof runtimeActionSubmit>>>(directory, runtimeActionSubmit),
      updateSubmission: runtimeBotCall(directory, runtimeActionUpdateSubmission),
      addAttachment: runtimeBotCall(directory, runtimeActionAddAttachment),
      removeAttachment: runtimeBotCall(directory, runtimeActionRemoveAttachment),
      retainAttachments: runtimeBotCall(directory, runtimeActionRetainAttachments),
      expireAttachments: runtimeBotCall(directory, runtimeActionExpireAttachments),
      stop: runtimeBotCall(directory, (deps, params: RuntimeTypes.RuntimeConversationParams & RuntimeTypes.RuntimeContextInput) => (
        runtimeQueryConversation(deps, params).then((conversation) => conversation.abort(params.context))
      )),
    },
    queries: {
      artifactBlocks: () => artifactBlocksCatalog,
      artifactVersions: runtimeBotCall(directory, runtimeQueryArtifactVersions),
      artifact: runtimeBotCall(directory, runtimeQueryArtifact),
      artifacts: runtimeBotCall(directory, runtimeQueryListArtifacts),
      botArtifacts: runtimeBotCall(directory, runtimeQueryListBotArtifacts),
      search: runtimeBotCall(directory, runtimeQuerySearch),
      routines: runtimeBotCall(directory, runtimeQueryListRoutines),
      todos: runtimeBotCall(directory, runtimeQueryListTodos),
      activity: runtimeBotCall(directory, runtimeQueryActivity),
      activityRun: runtimeBotCall(directory, runtimeQueryActivityRun),
      questions: runtimeBotCall(directory, runtimeQueryQuestions),
      reactions: runtimeBotCall(directory, runtimeQueryReactions),
      attachment: runtimeBotCall(directory, runtimeQueryAttachment),
      attachments: runtimeBotCall(directory, runtimeQueryAttachments),
      attachmentTarget: runtimeBotCall(directory, runtimeQueryAttachmentTarget),
      contextUsage: runtimeBotCall(directory, runtimeQueryContextUsage),
      usage: runtimeBotCall(directory, runtimeQueryUsage),
      botUsage: runtimeBotCall(directory, runtimeQueryBotUsage),
      contexts: runtimeBotCall(directory, runtimeQueryContexts),
      hasEntry: runtimeBotCall(directory, runtimeQueryHasEntry),
      conversations: async (context: Context = BACKGROUND_CONTEXT): Promise<ConversationIndexSummary[]> => {
        const lists = await Promise.all(directory.opened().map((bot) => bot.deps.index.queries.list(context)));
        return lists.flat();
      },
      submission: runtimeBotCall(directory, runtimeQuerySubmission),
      commands: () => runtimeQueryCommands(),
      approvals: runtimeBotCall(directory, runtimeQueryApprovals),
      models: () => runtimeQueryModels(shared),
      validateModel: (params: RuntimeTypes.RuntimeModelParams) => runtimeQueryValidateModel(shared, params),
      history: runtimeBotCall(directory, runtimeQueryHistory),
    },
    watchConversations: (context: Context = BACKGROUND_CONTEXT) => {
      const lists = new Map<string, ConversationIndexSummary[]>();

      return runtimeWatchMerge<{ conversations: ConversationIndexSummary[] }, { conversations: ConversationIndexSummary[] }>({
        directory,
        initial: { conversations: [] },
        attach: (bot, watchContext) => bot.deps.index.watch(watchContext),
        apply: (draft, botId, value) => {
          match(value)
            .with(P.nonNullable, ({ conversations }) => lists.set(botId, conversations))
            .otherwise(() => lists.delete(botId));
          draft.conversations = [...lists.values()].flat();
        },
        context,
      });
    },
    watchNotifications: (context: Context = BACKGROUND_CONTEXT) => {
      const pending = new Map<string, UniversalTypes.NotificationItem[]>();
      const recent = new Map<string, UniversalTypes.NotificationItem[]>();
      const seen = new Set<string>();

      return runtimeWatchMerge<UniversalTypes.NotificationState, UniversalTypes.NotificationState>({
        directory,
        initial: { pending: [], recent: [] },
        attach: (bot, watchContext) => bot.notifications.watch(watchContext),
        apply: (draft, botId, value) => {
          match(value)
            .with(P.nonNullable, (state) => {
              pending.set(botId, state.pending);
              recent.set(botId, state.recent);

              for (const item of state.recent) {
                const key = notificationItemKey(item);

                match(seen.has(key))
                  .with(true, () => undefined)
                  .with(false, () => {
                    seen.add(key);
                    draft.recent = notificationRecentAppend(draft.recent, item);
                  })
                  .exhaustive();
              }
            })
            .otherwise(() => {
              pending.delete(botId);
              recent.delete(botId);
            });
          draft.pending = [...pending.values()].flat();
          const visible = [...draft.recent, ...[...recent.values()].flat()].map(notificationItemKey);
          seen.clear();

          for (const key of visible) {
            seen.add(key);
          }
        },
        context,
      });
    },
    watchContexts: runtimeBotCall(directory, runtimeQueryWatchContexts),
    watch: runtimeBotCall(directory, runtimeQueryWatch),
    resume: () => {
      for (const bot of directory.opened()) {
        bot.wake();
      }
    },
    close: async () => {
      unlisten();
      unlistenFailures();
      await directory.closeAll();
    },
  };
}

export type RuntimeService = ReturnType<typeof makeRuntimeService>;
