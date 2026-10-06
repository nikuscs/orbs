import { z } from 'zod';
import { botCreateInput, botDeleteInput, botUpdateInput } from './bot.types';
import { memoryForgetInput, memoryListInput, memorySaveInput, memoryUpdateInput } from './memory.types';
import { roomInputCreate, roomInputDelete, roomInputUpdate } from './room-input.types';

const mcpInternalBotFields = botUpdateInput
  .omit({
    botId: true,
    permission: true,
    homeDir: true,
    inherit: true,
  })
  .strict();

const mcpInternalBotCreate = mcpInternalBotFields.extend({ name: botCreateInput.shape.name });

const mcpInternalGroupEdit = roomInputUpdate
  .omit({ botIds: true })
  .extend({
    addBotIds: z.array(z.string().min(1)).max(8).optional(),
    removeBotIds: z.array(z.string().min(1)).max(8).optional(),
    leaderBotId: z.string().min(1).optional(),
  })
  .strict();

export const mcpInternalCall = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('memory_list'),
    input: memoryListInput.omit({ scope: true }).extend({ scope: z.enum(['global', 'bot', 'room']).default('room') }),
  }),
  z.object({
    name: z.literal('memory_search'),
    input: memoryListInput.omit({ scope: true }).extend({ scope: z.enum(['global', 'bot', 'room']).default('room') }),
  }),
  z.object({
    name: z.literal('memory_save'),
    input: memorySaveInput.omit({ scope: true }).extend({ sourceMessageIds: z.array(z.string().min(1)).min(1).max(50) }),
  }),
  z.object({
    name: z.literal('memory_update'),
    input: memoryUpdateInput.omit({ scope: true }).extend({ sourceMessageIds: z.array(z.string().min(1)).min(1).max(50) }),
  }),
  z.object({ name: z.literal('memory_forget'), input: memoryForgetInput.omit({ scope: true }) }),
  z.object({
    name: z.literal('room_history'),
    input: z.object({
      query: z.string().max(200).default(''),
      beforeSeq: z.int().positive().optional(),
      limit: z.int().min(1).max(50).default(20),
      includeBeforeFresh: z.boolean().default(false),
    }),
  }),
  z.object({ name: z.literal('bot_list'), input: z.object({}).strict() }),
  z.object({ name: z.literal('bot_get'), input: botDeleteInput.strict() }),
  z.object({ name: z.literal('model_list'), input: z.object({}).strict() }),
  z.object({ name: z.literal('bot_create'), input: mcpInternalBotCreate }),
  z.object({ name: z.literal('bot_edit'), input: mcpInternalBotFields.extend({ botId: z.string().min(1) }) }),
  z.object({ name: z.literal('bot_delete'), input: botDeleteInput.strict() }),
  z.object({ name: z.literal('group_list'), input: z.object({}).strict() }),
  z.object({ name: z.literal('group_get'), input: roomInputDelete.extend({ messages: z.int().min(0).max(100).default(10) }).strict() }),
  z.object({
    name: z.literal('group_create'),
    input: roomInputCreate
      .extend({
        description: roomInputCreate.shape.description.default(''),
        driver: roomInputCreate.shape.driver.default(null),
        sendMode: roomInputCreate.shape.sendMode.default('queue'),
      })
      .strict(),
  }),
  z.object({ name: z.literal('group_edit'), input: mcpInternalGroupEdit }),
  z.object({ name: z.literal('group_delete'), input: roomInputDelete.strict() }),
]);

export type McpInternalCall = z.infer<typeof mcpInternalCall>;
export type McpInternalToolName = McpInternalCall['name'];
export type McpInternalBotCall = Extract<McpInternalCall, { name: 'bot_create' | 'bot_edit' | 'bot_delete' }>;
export type McpInternalGroupCall = Extract<McpInternalCall, { name: 'group_create' | 'group_edit' | 'group_delete' }>;

export const mcpInternalResult = z.object({ text: z.string(), isError: z.boolean() });
export type McpInternalResult = z.infer<typeof mcpInternalResult>;
