import type { AttachmentStorageService } from '../services/attachment/attachment-storage.service';
import type { AvatarImageService } from '../services/avatar/avatar-image.service';
import type { CredentialsService } from '../services/credentials/credentials.service';
import type { DatabaseService } from '../services/database/database.service';
import type { LinkResolverService } from '../services/link/link-resolver.service';
import type { McpAuthService } from '../services/mcp/mcp-auth.service';
import type { McpService } from '../services/mcp/mcp.service';
import type { SecretService } from '../services/secret/secret.service';
import type { ServerNetworkService } from '../services/server/server-network.service';
import type { ServerService } from '../services/server/server.service';
import type { SettingsService } from '../services/settings/settings.service';
import type { WorkspaceService } from '../services/workspace/workspace.service';
import type * as ServerTypes from '@repo/runtime/server';

export interface CoreServicesParams {
  database: DatabaseService;
  attachmentStorage: AttachmentStorageService;
  avatarImages: AvatarImageService;
  credentials: CredentialsService;
  secrets: SecretService;
  settings: SettingsService;
  workspace: WorkspaceService;
  skillLoader: ServerTypes.SkillLoaderService;
  instructionLoader: ServerTypes.InstructionLoaderService;
  pluginLoader: ServerTypes.PluginLoaderService;
  mcp: McpService;
  mcpAuth: ServerTypes.McpAuthService;
  network: ServerNetworkService;
  linkResolver: LinkResolverService;
  appScheme: string;
  providers: ServerTypes.ProviderService;
  runtime: Omit<ServerTypes.RuntimeServiceParams, 'permissions' | 'collaboration' | 'gifs'>;
}

export interface CoreHandlerDeps {
  mcpAuth: McpAuthService;
  server: ServerService;
}
