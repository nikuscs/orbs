import { authedRouter } from './rpc.procedures';

export const mcp = {
  discover: authedRouter.mcp.discover.handler(async ({ context, input }) => context.bots.queries.mcp(input)),
  shared: authedRouter.mcp.shared.handler(async ({ context, input }) => context.bots.queries.sharedMcp(input)),
  connect: authedRouter.mcp.connect.handler(async ({ context, input }) => context.bots.actions.connectMcp(input)),
  add: authedRouter.mcp.add.handler(async ({ context, input }) => context.bots.actions.addMcp(input)),
  remove: authedRouter.mcp.remove.handler(async ({ context, input }) => context.bots.actions.removeMcp(input)),
  settings: authedRouter.mcp.settings.handler(async ({ context }) => context.mcp.queries.settings()),
  configure: authedRouter.mcp.configure.handler(async ({ context, input }) => context.mcp.actions.configure(input)),
};
