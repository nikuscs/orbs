import { DEFAULT_EXPRESSION, EXPRESSIONS } from '@orbs/avatar-blobs/expressions';
import { BODIES, COLORS, DEFAULT_BODY, DEFAULT_COLOR } from '@orbs/avatar-blobs/skins';
import { z } from 'zod';
import { BOT } from '#services/bot/bot.constants';
import type { Database, DatabaseBot } from '#/types/database.types';

export const botBlobAvatar = z.object({
  kind: z.literal('blob'),
  body: z.enum(BODIES.map((body) => body.id)),
  color: z.enum(COLORS.map((color) => color.id)),
  expression: z.enum(EXPRESSIONS.map((expression) => expression.id)),
});

export const botAvatar = z.discriminatedUnion('kind', [
  botBlobAvatar,
  z.object({ kind: z.literal('image'), src: z.string().max(100_000).regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/) }),
  z.object({ kind: z.literal('color'), color: z.string().regex(/^#[\da-f]{6}$/i) }),
  z.object({
    kind: z.literal('emoji'),
    emoji: z.string().trim().min(1).max(16),
    color: z.string().regex(/^#[\da-f]{6}$/i),
  }),
]);

export type BotAvatarPreference = z.infer<typeof botAvatar>;

export const botDefaultAvatar = {
  kind: 'blob',
  body: DEFAULT_BODY,
  color: DEFAULT_COLOR,
  expression: DEFAULT_EXPRESSION,
} satisfies BotAvatarPreference;

export interface Bot extends Omit<DatabaseBot, 'avatar' | 'inherit'> {
  avatar: BotAvatarPreference | null;
  inherit: BotInheritResource[];
}

export const botInheritResource = z.enum(['skills', 'agentsFile', 'mcp', 'plugins']);
export type BotInheritResource = z.infer<typeof botInheritResource>;

export const botInherit = z.array(botInheritResource).transform((resources) => [...new Set(resources)]);

export const botThinkingLevel = z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
export type BotThinkingLevel = z.infer<typeof botThinkingLevel>;

export const botPermission = z.enum(['read-only', 'ask', 'auto', 'full']);
export type BotPermission = z.infer<typeof botPermission>;

const botAvatarField = botAvatar.nullable();
const botHandleField = z.string().trim().toLowerCase().max(BOT.handleMaxLength).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, { error: 'validation_handle' });
const botInstructionsField = z.string().trim().max(4000);
const botHomeDirField = z.string().trim().min(1).max(512).transform((dir) => dir.replace(/(?<=.)\/+$/, ''));

const botFields = z.object({
  avatar: botAvatarField,
  name: z.string().trim().min(1).max(64),
  handle: botHandleField,
  instructions: botInstructionsField,
  harnessId: z.string().trim().min(1).max(64),
  modelProvider: z.string().trim().min(1).max(64),
  modelId: z.string().trim().min(1).max(128),
  thinkingLevel: botThinkingLevel,
  permission: botPermission,
  homeDir: botHomeDirField,
  inherit: botInherit,
});

export const botCreateInput = botFields.extend({
  avatar: botAvatarField.default(null),
  handle: botHandleField.optional(),
  instructions: botInstructionsField.default(''),
  permission: botPermission.default(BOT.defaultPermission),
  homeDir: botHomeDirField.optional(),
  inherit: botInherit.default(['skills', 'mcp', 'plugins']),
});

export type BotCreateInput = z.infer<typeof botCreateInput>;

export const botUpdateInput = botFields.partial().extend({ botId: z.string().min(1) });
export type BotUpdateInput = z.infer<typeof botUpdateInput>;

export const botSkillsInput = z.object({ botId: z.string().min(1) });

export const botModelsInput = z.object({ harnessId: z.string().trim().min(1).max(64) });

export const botDeleteInput = z.object({ botId: z.string().min(1) });

export interface BotActionDeleteParams {
  organizationId: string;
  botId: string;
}

export interface BotActionUpdateParams extends BotUpdateInput {
  organizationId: string;
}

export interface BotAssertHandleFreeParams {
  organizationId: string;
  handle: string;
  botId?: string;
}

export interface BotServiceDeps {
  database: Database;
}

export interface BotActionCreateParams extends BotCreateInput {
  organizationId: string;
}

export interface BotQueryListParams {
  organizationId: string;
}

export interface BotQueryGetParams {
  organizationId: string;
  botId: string;
}
