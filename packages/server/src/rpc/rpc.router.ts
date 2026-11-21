import { activity } from './rpc.activity';
import { artifacts } from './rpc.artifacts';
import { attachments } from './rpc.attachments';
import { avatars } from './rpc.avatars';
import { bots } from './rpc.bots';
import { commands } from './rpc.commands';
import { computers } from './rpc.computers';
import { conversation } from './rpc.conversation';
import { credentials } from './rpc.credentials';
import { devices } from './rpc.devices';
import { instructions } from './rpc.instructions';
import { limits } from './rpc.limits';
import { links } from './rpc.links';
import { mcp } from './rpc.mcp';
import { mcpAuth } from './rpc.mcp-auth';
import { models } from './rpc.models';
import { notifications } from './rpc.notifications';
import { onboarding } from './rpc.onboarding';
import { pairing } from './rpc.pairing';
import { plugins } from './rpc.plugins';
import { rpcRouter } from './rpc.procedures';
import { providers } from './rpc.providers';
import { routines } from './rpc.routines';
import { secrets } from './rpc.secrets';
import { rpcServer } from './rpc.server';
import { sidebarSections } from './rpc.sidebar-sections';
import { skills } from './rpc.skills';
import { todos } from './rpc.todos';
import { tools } from './rpc.tools';

export const router = rpcRouter.router({
  server: rpcServer,
  onboarding,
  limits,
  links,
  providers,
  mcpAuth,
  routines,
  todos,
  activity,
  attachments,
  avatars,
  artifacts,
  bots,
  commands,
  computers,
  devices,
  notifications,
  conversation,
  sidebarSections,
  credentials,
  secrets,
  pairing,
  tools,
  skills,
  plugins,
  instructions,
  mcp,
  models,
});
