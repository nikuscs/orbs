import { z } from 'zod';
import { conversationTarget } from './conversation.types';

export const commandList = conversationTarget;
export const commandArguments = z.string().max(64000);
export const commandIdArguments = z.string().regex(/^[1-9]\d{0,15}$/).refine((value) => Number.isSafeInteger(Number(value)));

export const command = z.object({
  name: z.string().min(1),
  description: z.string(),
  argumentsSchema: z.record(z.string(), z.json()),
  argumentHint: z.string().nullable(),
});

export const commandCatalog = z.array(command);

export const commandExecute = commandList.extend({
  name: z.string().min(1).max(64),
  arguments: commandArguments.optional(),
});

export const commandExecuteResult = z.object({ compacted: z.boolean().optional() });

export type Command = z.infer<typeof command>;
export type CommandExecuteInput = z.infer<typeof commandExecute>;
export type CommandExecuteResult = z.infer<typeof commandExecuteResult>;
