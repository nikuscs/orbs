import { EXPRESSIONS } from '@repo/avatar-blobs/expressions';
import { BODIES, COLORS } from '@repo/avatar-blobs/skins';
import { z } from 'zod';
import { instructionCatalog } from './instruction.types';
import { mcpCatalog } from './mcp.types';
import { modelSelection, modelThinkingLevel } from './model.types';
import { pluginCatalog } from './plugin.types';
import { skill } from './skill.types';

export const botAvatarImage = z.object({ kind: z.literal('image'), src: z.string().regex(/^\/avatars\/[\da-f-]{36}\.webp$/) });

export const botAvatar = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('blob'),
    body: z.enum(BODIES.map((body) => body.id)),
    color: z.enum(COLORS.map((color) => color.id)),
    expression: z.enum(EXPRESSIONS.map((expression) => expression.id)),
  }),
  botAvatarImage,
  z.object({ kind: z.literal('color'), color: z.string().regex(/^#[\da-f]{6}$/i) }),
  z.object({
    kind: z.literal('emoji'),
    emoji: z.string().trim().min(1).max(16),
    color: z.string().regex(/^#[\da-f]{6}$/i),
  }),
]);

export const botInherit = z.array(z.enum(['skills', 'agentsFile', 'mcp', 'plugins']))
  .max(4).transform((resources) => [...new Set(resources)]);

export const botFields = z.object({
  avatar: botAvatar.nullable(),
  name: z.string().trim().min(1).max(64),
  handle: z.string().trim().toLowerCase().min(1).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'validation_handle' }),
  instructions: z.string().max(16000),
  ...modelSelection.shape,
  fallbackModel: modelSelection.nullable(),
  permission: z.enum(['read-only', 'ask', 'auto', 'full']),
  inherit: botInherit,
  sharedSkills: z.array(z.string().trim().min(1).max(128)).max(500).nullable(),
  sharedMcp: z.array(z.string().trim().min(1).max(128)).max(200).nullable(),
  disabledSkills: z.array(z.string().trim().min(1).max(128)).max(500).nullable(),
});

export const bot = botFields.extend({
  id: z.uuid(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const botList = z.array(bot);
export const botGet = z.object({ botId: z.uuid() });

export const botCreate = botFields.extend({
  avatar: botFields.shape.avatar.default(null),
  instructions: botFields.shape.instructions.default(''),
  fallbackModel: modelSelection.nullable().default(null),
  thinkingLevel: modelThinkingLevel.default('off'),
  permission: botFields.shape.permission.default('ask'),
  inherit: botInherit.default(['skills', 'mcp', 'plugins']),
  sharedSkills: botFields.shape.sharedSkills.default(null),
  sharedMcp: botFields.shape.sharedMcp.default(null),
  disabledSkills: botFields.shape.disabledSkills.default(null),
});

export const botUpdate = botFields.partial().extend(botGet.shape);

export const botDeleteResult = z.void();

export const botCatalog = z.object({
  skills: z.array(skill),
  mcp: mcpCatalog,
  plugins: pluginCatalog,
  instructions: instructionCatalog,
});

export const botSwapModels = z.object({
  botIds: z.array(z.uuid()).min(1).max(1000).refine((ids) => new Set(ids).size === ids.length),
  from: modelSelection.pick({ modelProvider: true, modelId: true }),
  to: modelSelection,
  includeFallbacks: z.boolean().default(false),
});

export const botSwapModelsResult = z.object({
  primary: z.number().int().nonnegative(),
  fallbacks: z.number().int().nonnegative(),
});

export const botForm = botCreate.extend({ handle: botFields.shape.handle.or(z.literal('')) });

export const botSection = z.enum(['profile', 'instructions', 'model', 'tools', 'skills', 'mcp', 'todos', 'routines', 'danger']);

export const botFormSection = botSection.extract(['profile', 'instructions', 'model', 'tools']);

export type Bot = z.infer<typeof bot>;
export type BotAvatarImage = z.infer<typeof botAvatarImage>;
export type BotCreateInput = z.infer<typeof botCreate>;
export type BotUpdateInput = z.infer<typeof botUpdate>;
export type BotGetInput = z.infer<typeof botGet>;
export type BotCatalog = z.infer<typeof botCatalog>;
export type BotSwapModelsInput = z.infer<typeof botSwapModels>;
export type BotSwapModelsResult = z.infer<typeof botSwapModelsResult>;
export type BotForm = z.infer<typeof botForm>;
export type BotSection = z.infer<typeof botSection>;
export type BotFormSection = z.infer<typeof botFormSection>;
