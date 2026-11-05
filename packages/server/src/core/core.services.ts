import { makeRuntimeService } from '@repo/runtime/server';
import { makeActivityService } from '../services/activity/activity.service';
import { makeArtifactService } from '../services/artifact/artifact.service';
import { makeAttachmentService } from '../services/attachment/attachment.service';
import { makeAuthService } from '../services/auth/auth.service';
import { makeAvatarService } from '../services/avatar/avatar.service';
import { makeBotService } from '../services/bot/bot.service';
import { makeCollaborationService } from '../services/collaboration/collaboration.service';
import { makeConversationService } from '../services/conversation/conversation.service';
import { makeGifService } from '../services/gif/gif.service';
import { makeInstructionService } from '../services/instruction/instruction.service';
import { makeLimitService } from '../services/limit/limit.service';
import { makeLinkService } from '../services/link/link.service';
import { makeMcpAuthService } from '../services/mcp/mcp-auth.service';
import { makeNotificationService } from '../services/notification/notification.service';
import { makeOnboardingService } from '../services/onboarding/onboarding.service';
import { makePluginService } from '../services/plugin/plugin.service';
import { makeRoutineService } from '../services/routine/routine.service';
import { makeServerService } from '../services/server/server.service';
import { makeSidebarSectionService } from '../services/sidebar-section/sidebar-section.service';
import { makeSkillService } from '../services/skill/skill.service';
import { makeTodoService } from '../services/todo/todo.service';
import { makeToolService } from '../services/tool/tool.service';
import type { CoreServicesParams } from '../types/core.types';

export async function makeServices({
  database,
  attachmentStorage,
  avatarImages,
  credentials,
  secrets,
  settings,
  workspace,
  skillLoader,
  instructionLoader,
  pluginLoader,
  mcp,
  mcpAuth,
  network,
  linkResolver,
  appScheme,
  providers,
  runtime: runtimeOptions,
}: CoreServicesParams) {
  const tools = makeToolService({
    database,
    credentials,
    settings,
  });

  const collaboration = makeCollaborationService({ database });
  const gifs = makeGifService({ settings });

  const runtime = makeRuntimeService({
    ...runtimeOptions,
    permissions: tools,
    collaboration,
    gifs,
  });

  try {
    const server = makeServerService({ settings, network });
    await server.queries.info();
    const auth = makeAuthService({ database, appScheme });
    const limits = makeLimitService({ settings });
    await limits.ready;
    auth.onRevoke((deviceId) => {
      providers.actions.cancelDevice({ deviceId });
      mcpAuth.actions.cancelDevice({ deviceId });
    });
    const skill = makeSkillService({ settings, loader: skillLoader });
    const instruction = makeInstructionService({ settings, loader: instructionLoader });
    const plugin = makePluginService({ settings, loader: pluginLoader });

    const sidebarSections = makeSidebarSectionService({ database });

    const bots = makeBotService({
      database,
      runtime,
      workspace,
      skill,
      instruction,
      plugin,
      mcp,
    });

    const attachments = makeAttachmentService({
      bots,
      runtime,
      storage: attachmentStorage,
    });

    runtime.actions.registerBotTools({ bots });
    runtime.actions.registerAttachmentTools({ attachments });

    const notifications = makeNotificationService({
      database,
      runtime,
      bots,
      settings,
    });

    await bots.actions.restore();
    runtime.resume();

    return {
      routines: makeRoutineService({ bots, runtime }),
      todos: makeTodoService({ bots, runtime }),
      activity: makeActivityService({ bots, runtime }),
      artifacts: makeArtifactService({ bots, runtime }),
      notifications,
      server,
      onboarding: makeOnboardingService({ settings }),
      limits,
      links: makeLinkService({ resolver: linkResolver }),
      providers,
      mcpAuth: makeMcpAuthService({
        bots,
        mcp,
        oauth: mcpAuth,
        auth,
      }),
      attachments,
      avatars: makeAvatarService({ bots, images: avatarImages }),
      database,
      auth,
      credentials,
      secrets,
      settings,
      workspace,
      collaboration,
      bots,
      runtime,
      tools,
      gif: gifs,
      skills: skill,
      instructions: instruction,
      plugins: plugin,
      mcp,
      sidebarSections,
      conversation: makeConversationService({
        notifications,
        runtime,
        auth,
        bots,
        secrets,
        sidebarSections,
        settings,
        skill,
        attachments,
        tools,
        gifs,
      }),
    };
  } catch (error) {
    await runtime.close();
    throw error;
  }
}
