import { asyncIteratorObject, oc as baseContract } from '@orpc/contract';
import { openapi } from '@orpc/openapi';
import { errorSchemas } from '@repo/errors/universal';
import { activityListInput, activityPage, activityRun, activityRunGet } from '../types/activity.types';
import {
  artifact,
  artifactBlocks,
  artifactBotListInput,
  artifactCreate,
  artifactGet,
  artifactList,
  artifactListInput,
  artifactRestore,
  artifactSaveState,
  artifactUpdate,
  artifactVersionList,
  artifactVersionsInput,
} from '../types/artifact.types';
import { attachment, attachmentDownload, attachmentGet, attachmentList, attachmentPage, attachmentRemoveResult, attachmentUpload } from '../types/attachment.types';
import {
  authPairResult,
  authRedeem,
  authRedeemResult,
} from '../types/auth.types';
import { avatarUpload } from '../types/avatar.types';
import { bot, botAvatarImage, botCatalog, botCreate, botDeleteResult, botGet, botList, botSwapModels, botSwapModelsResult, botUpdate } from '../types/bot.types';
import { commandCatalog, commandExecute, commandExecuteResult, commandList } from '../types/command.types';
import { conversationContextUsage } from '../types/conversation-context-usage.types';
import { conversationUsage } from '../types/conversation-usage.types';
import {
  conversationAnswerQuestion,
  conversationAnswerQuestionResult,
  conversationArrange,
  conversationArrangeResult,
  conversationClearResult,
  conversationConfigure,
  conversationContextPage,
  conversationContexts,
  conversationFrame,
  conversationHistory,
  conversationHistoryResult,
  conversationList,
  conversationMarkRead,
  conversationPreferences,
  conversationQuestionList,
  conversationReactions,
  conversationReactionsResult,
  conversationSearch,
  conversationSearchResult,
  conversationSetHidden,
  conversationSetMuted,
  conversationSetPinned,
  conversationSetReaction,
  conversationSetReactionResult,
  conversationSettings,
  conversationSetWhenBusy,
  conversationStopResult,
  conversationSubmit,
  conversationSubmitResult,
  conversationTarget,
  conversationUpdateSubmission,
  conversationUpdateSubmissionResult,
} from '../types/conversation.types';
import { credentialsList, credentialsSet, credentialsSetResult } from '../types/credentials.types';
import { deviceList, deviceRevoke, deviceRevokeResult } from '../types/device.types';
import { instructionCatalog, instructionConfigure, instructionDiscover, instructionSettings } from '../types/instruction.types';
import { limitConfigure, limitSettings } from '../types/limit.types';
import { linkPreview, linkPreviewInput } from '../types/link.types';
import {
  mcpAuthCancelResult,
  mcpAuthComplete,
  mcpAuthCompleteResult,
  mcpAuthLogoutResult,
  mcpAuthStart,
  mcpAuthStartResult,
  mcpAuthStatusResult,
  mcpAuthTarget,
} from '../types/mcp-auth.types';
import { mcpCatalog, mcpCatalogServer, mcpConfigure, mcpDiscover, mcpServerAdd, mcpServerRemove, mcpSettings, mcpShared } from '../types/mcp.types';
import { modelList } from '../types/model.types';
import { notificationConfigure, notificationPresence, notificationPush, notificationSettings, notificationVoid } from '../types/notification.types';
import { onboardingState } from '../types/onboarding.types';
import { pluginCatalog, pluginConfigure, pluginDiscover, pluginSettings } from '../types/plugin.types';
import { providerCancelResult, providerComplete, providerList, providerLogin, providerLogout, providerLogoutResult, providerSession, providerSessionId } from '../types/provider.types';
import { routine, routineCreate, routineList, routineRemoveResult, routineTarget, routineUpdate } from '../types/routine.types';
import { secretConfigure, secretRemove, secretRules, secretSave, secretSettings, secretVoid } from '../types/secret.types';
import { serverConfigure, serverInfo } from '../types/server.types';
import {
  sidebarSection,
  sidebarSectionArrange,
  sidebarSectionCreate,
  sidebarSectionList,
  sidebarSectionRename,
  sidebarSectionSetCollapsed,
  sidebarSectionTarget,
  sidebarSectionVoid,
} from '../types/sidebar-section.types';
import { skillCatalog, skillConfigure, skillDiscover, skillSettings } from '../types/skill.types';
import { todo, todoCreate, todoList, todoRemoveResult, todoReorder, todoTarget, todoUpdate } from '../types/todo.types';
import {
  toolAnswer,
  toolAnswerResult,
  toolApprovalList,
  toolConfigure,
  toolPending,
  toolSettings,
} from '../types/tool.types';

const oc = baseContract.errors({
  RATE_LIMITED: errorSchemas.RATE_LIMITED,
  PROTOCOL_MISMATCH: errorSchemas.PROTOCOL_MISMATCH,
  SERVER_MISMATCH: errorSchemas.SERVER_MISMATCH,
});

const ocAuth = oc.errors({ UNAUTHORIZED: errorSchemas.UNAUTHORIZED });
const ocFind = ocAuth.errors({ NOT_FOUND: errorSchemas.NOT_FOUND });
const ocBusy = ocFind.errors({ CONFLICT: errorSchemas.CONFLICT });
const ocValidate = ocFind.errors({ VALIDATION_ERROR: errorSchemas.VALIDATION_ERROR });
const ocWrite = ocValidate.errors({ CONFLICT: errorSchemas.CONFLICT });
const ocAdmin = ocWrite.errors({ FORBIDDEN: errorSchemas.FORBIDDEN });

export const contract = {
  providers: {
    list: ocAuth.output(providerList),
    login: ocAdmin.input(providerLogin).output(providerSession),
    complete: ocAdmin.input(providerComplete).output(providerSession),
    session: ocFind.input(providerSessionId).output(providerSession),
    cancel: oc
      .errors({
        UNAUTHORIZED: errorSchemas.UNAUTHORIZED,
        FORBIDDEN: errorSchemas.FORBIDDEN,
        NOT_FOUND: errorSchemas.NOT_FOUND,
        CONFLICT: errorSchemas.CONFLICT,
      })
      .input(providerSessionId)
      .output(providerCancelResult),
    logout: ocFind.input(providerLogout).output(providerLogoutResult),
  },
  limits: {
    settings: ocAuth.output(limitSettings),
    configure: ocAuth.input(limitConfigure).output(limitSettings),
  },
  mcpAuth: {
    start: ocAdmin.input(mcpAuthStart).output(mcpAuthStartResult),
    complete: ocAdmin.input(mcpAuthComplete).output(mcpAuthCompleteResult),
    cancel: oc
      .errors({
        UNAUTHORIZED: errorSchemas.UNAUTHORIZED,
        FORBIDDEN: errorSchemas.FORBIDDEN,
        NOT_FOUND: errorSchemas.NOT_FOUND,
      })
      .input(mcpAuthTarget)
      .output(mcpAuthCancelResult),
    logout: ocFind.input(mcpAuthTarget).output(mcpAuthLogoutResult),
    status: ocFind.input(mcpAuthTarget).output(mcpAuthStatusResult),
  },
  credentials: {
    list: ocAuth.output(credentialsList),
    set: ocAuth.input(credentialsSet).output(credentialsSetResult),
  },
  secrets: {
    list: ocAuth.output(secretRules),
    save: ocAuth.input(secretSave).output(secretVoid),
    remove: ocAuth.input(secretRemove).output(secretVoid),
    settings: ocAuth.output(secretSettings),
    configure: ocAuth.input(secretConfigure).output(secretSettings),
  },
  artifacts: {
    blocks: ocAuth.output(artifactBlocks),
    list: ocFind.input(artifactListInput).output(artifactList),
    listBot: ocFind.input(artifactBotListInput).output(artifactList),
    get: ocFind.input(artifactGet).output(artifact),
    versions: ocFind.input(artifactVersionsInput).output(artifactVersionList),
    create: ocWrite.input(artifactCreate).output(artifact),
    update: ocWrite.input(artifactUpdate).output(artifact),
    saveState: ocWrite.input(artifactSaveState).output(artifact),
    restore: ocWrite.input(artifactRestore).output(artifact),
  },
  routines: {
    list: ocFind.input(botGet).output(routineList),
    create: ocValidate.input(routineCreate).output(routine),
    update: ocValidate.input(routineUpdate).output(routine),
    run: ocBusy.input(routineTarget).output(routine),
    remove: ocFind.input(routineTarget).output(routineRemoveResult),
  },
  todos: {
    list: ocFind.input(botGet).output(todoList),
    create: ocValidate.input(todoCreate).output(todo),
    update: ocValidate.input(todoUpdate).output(todo),
    reorder: ocValidate.input(todoReorder).output(todoList),
    remove: ocFind.input(todoTarget).output(todoRemoveResult),
  },
  activity: {
    list: ocFind.input(activityListInput).output(activityPage),
    run: ocFind.input(activityRunGet).output(activityRun),
  },
  links: {
    preview: ocAuth.input(linkPreviewInput).output(linkPreview.nullable()),
  },
  avatars: {
    upload: ocAuth.input(avatarUpload).output(botAvatarImage),
  },
  attachments: {
    upload: ocFind.input(attachmentUpload).output(attachment),
    download: oc
      .meta(openapi({ method: 'GET', path: '/{botId}/{attachmentId}' }))
      .errors({ UNAUTHORIZED: errorSchemas.UNAUTHORIZED, NOT_FOUND: errorSchemas.NOT_FOUND })
      .input(attachmentGet)
      .output(attachmentDownload),
    poster: oc
      .meta(openapi({ method: 'GET', path: '/{botId}/{attachmentId}/poster' }))
      .errors({ UNAUTHORIZED: errorSchemas.UNAUTHORIZED, NOT_FOUND: errorSchemas.NOT_FOUND })
      .input(attachmentGet)
      .output(attachmentDownload),
    list: ocFind.input(attachmentList).output(attachmentPage),
    remove: ocBusy.input(attachmentGet).output(attachmentRemoveResult),
  },
  server: {
    info: ocAuth.output(serverInfo),

    configure: ocAuth.input(serverConfigure).output(serverInfo),
  },

  onboarding: {
    state: ocAuth.output(onboardingState),
    complete: ocAuth.output(onboardingState),
  },

  models: {
    list: ocAuth.output(modelList),
  },

  commands: {
    list: ocFind.input(commandList).output(commandCatalog),

    execute: ocWrite.input(commandExecute).output(commandExecuteResult),
  },

  plugins: {
    discover: ocFind.input(pluginDiscover).output(pluginCatalog),

    settings: ocAuth.output(pluginSettings),

    configure: ocAuth.input(pluginConfigure).output(pluginSettings),
  },

  instructions: {
    discover: ocFind.input(instructionDiscover).output(instructionCatalog),

    settings: ocAuth.output(instructionSettings),

    configure: ocAuth.input(instructionConfigure).output(instructionSettings),
  },

  skills: {
    discover: ocFind.input(skillDiscover).output(skillCatalog),

    shared: ocFind.input(skillDiscover).output(skillCatalog),

    settings: ocAuth.output(skillSettings),

    configure: ocAuth.input(skillConfigure).output(skillSettings),
  },

  mcp: {
    discover: ocFind.input(mcpDiscover).output(mcpCatalog),
    shared: ocFind.input(mcpDiscover).output(mcpShared),

    connect: ocFind.input(mcpDiscover).output(mcpCatalog),

    add: ocFind.input(mcpServerAdd).output(mcpCatalogServer),

    remove: ocFind.input(mcpServerRemove).output(bot),

    settings: ocAuth.output(mcpSettings),

    configure: ocAuth.input(mcpConfigure).output(mcpSettings),
  },

  tools: {
    settings: ocAuth.output(toolSettings),

    configure: ocAuth.input(toolConfigure).output(toolSettings),

    pending: ocFind.input(toolPending).output(toolApprovalList),

    answer: ocFind.input(toolAnswer).output(toolAnswerResult),
  },

  bots: {
    swapModels: ocWrite.input(botSwapModels).output(botSwapModelsResult),

    list: ocAuth.output(botList),

    get: ocFind.input(botGet).output(bot),

    create: oc
      .errors({
        UNAUTHORIZED: errorSchemas.UNAUTHORIZED,
        CONFLICT: errorSchemas.CONFLICT,
        VALIDATION_ERROR: errorSchemas.VALIDATION_ERROR,
      })
      .input(botCreate)
      .output(bot),

    update: ocWrite.input(botUpdate).output(bot),

    delete: ocFind.input(botGet).output(botDeleteResult),

    catalog: ocFind.input(botGet).output(botCatalog),

    usage: ocFind.input(botGet).output(conversationUsage),
  },

  pairing: {
    create: ocAuth.output(authPairResult),

    bootstrap: oc
      .errors({
        UNAUTHORIZED: errorSchemas.UNAUTHORIZED,
        CONFLICT: errorSchemas.CONFLICT,
      })
      .output(authPairResult),

    redeem: ocAuth.input(authRedeem).output(authRedeemResult),
  },

  sidebarSections: {
    list: ocAuth.output(sidebarSectionList),
    create: ocAuth.input(sidebarSectionCreate).output(sidebarSection),
    rename: ocFind.input(sidebarSectionRename).output(sidebarSection),
    remove: ocFind.input(sidebarSectionTarget).output(sidebarSectionVoid),
    arrange: ocFind.input(sidebarSectionArrange).output(sidebarSectionVoid),
    setCollapsed: ocFind.input(sidebarSectionSetCollapsed).output(sidebarSection),
  },

  conversation: {
    watchNotifications: ocAuth.output(asyncIteratorObject(conversationFrame)),

    search: ocValidate.input(conversationSearch).output(conversationSearchResult),
    questions: ocFind.input(conversationTarget).output(conversationQuestionList),
    answerQuestion: ocFind.input(conversationAnswerQuestion).output(conversationAnswerQuestionResult),
    setReaction: ocValidate.input(conversationSetReaction).output(conversationSetReactionResult),
    reactions: ocFind.input(conversationReactions).output(conversationReactionsResult),
    setHidden: ocFind.input(conversationSetHidden).output(conversationPreferences),
    setMuted: ocFind.input(conversationSetMuted).output(conversationPreferences),
    setWhenBusy: ocFind.input(conversationSetWhenBusy).output(conversationPreferences),
    settings: ocAuth.output(conversationSettings),
    configure: ocAuth.input(conversationConfigure).output(conversationSettings),
    arrange: ocFind.input(conversationArrange).output(conversationArrangeResult),

    contextUsage: ocFind.input(conversationTarget).output(conversationContextUsage),

    watchContexts: ocFind.input(conversationTarget).output(asyncIteratorObject(conversationFrame)),

    usage: ocFind.input(conversationTarget).output(conversationUsage),

    contexts: ocValidate.input(conversationContexts).output(conversationContextPage),

    markRead: ocFind.input(conversationMarkRead).output(conversationPreferences),

    setPinned: ocFind.input(conversationSetPinned).output(conversationPreferences),

    watchList: ocAuth.output(asyncIteratorObject(conversationFrame)),

    list: ocAuth.output(conversationList),

    history: ocValidate.input(conversationHistory).output(conversationHistoryResult),

    submit: ocBusy.input(conversationSubmit).output(conversationSubmitResult),

    updateSubmission: ocWrite.input(conversationUpdateSubmission).output(conversationUpdateSubmissionResult),

    stop: ocFind.input(conversationTarget).output(conversationStopResult),

    clear: ocFind.input(botGet).output(conversationClearResult),

    watch: ocFind.input(conversationTarget).output(asyncIteratorObject(conversationFrame)),
  },

  devices: {
    list: ocAuth.output(deviceList),

    revoke: ocAuth.input(deviceRevoke).output(deviceRevokeResult),
  },

  notifications: {
    settings: ocAuth.output(notificationSettings),

    configure: ocAuth.input(notificationConfigure).output(notificationSettings),

    presence: ocAuth.input(notificationPresence).output(notificationVoid),

    push: ocAuth.input(notificationPush).output(notificationVoid),
  },
};
