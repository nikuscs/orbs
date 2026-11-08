import { Type } from '@earendil-works/pi-ai';
import { QUESTION } from '@repo/contracts/universal';
import { z } from 'zod';
import type { ComputerService } from '../services/computer/computer.service';
import type { QuestionService } from '../services/question/question.service';
import type { ComputerHost } from './computer.types';

export interface ComputerToolDeps {
  computers: ComputerService;
  host: ComputerHost;
  questions: QuestionService;
}

const coordinate = z.number().transform((value) => Math.round(value));

export const computerToolRead = z.object({
  mode: z.enum(['screenshot', 'tree']),
  windowId: z.number().int().optional(),
}).strict();

export const computerToolActInput = z.object({
  action: z.enum(['click', 'double_click', 'right_click', 'move', 'drag', 'scroll', 'type', 'key']),
  x: z.number().optional(),
  y: z.number().optional(),
  toX: z.number().optional(),
  toY: z.number().optional(),
  dx: z.number().optional(),
  dy: z.number().optional(),
  text: z.string().optional(),
  keys: z.array(z.string().min(1)).optional(),
}).strict();

export const computerToolAct = z.discriminatedUnion('action', [
  z.object({
    action: z.enum(['click', 'double_click', 'right_click', 'move']),
    x: coordinate,
    y: coordinate,
  }),
  z.object({
    action: z.literal('drag'),
    x: coordinate,
    y: coordinate,
    toX: coordinate,
    toY: coordinate,
  }),
  z.object({
    action: z.literal('scroll'),
    x: coordinate,
    y: coordinate,
    dx: coordinate,
    dy: coordinate,
  }),
  z.object({ action: z.literal('type'), text: z.string().min(1) }),
  z.object({ action: z.literal('key'), keys: z.array(z.string().min(1)).min(1) }),
]);

export const computerToolHandoff = z.object({
  instructions: z.string().trim().min(1).max(QUESTION.maxText - 200),
}).strict();

export const computerToolBrowserOpen = z.object({ url: z.string().trim().min(1) }).strict();

export const computerToolBrowserAct = z.object({
  ref: z.string().min(1),
  action: z.enum(['click', 'fill', 'select', 'press', 'hover']),
  text: z.string().optional(),
}).strict();

export const computerToolBrowserTab = z.object({
  action: z.enum(['switch', 'close']),
  index: z.number().int().min(0),
}).strict();

export const computerToolEmptyParameters = Type.Object({}, { additionalProperties: false });
export const computerToolReadParameters = Type.Unsafe<z.infer<typeof computerToolRead>>(z.toJSONSchema(computerToolRead, { io: 'input' }));
export const computerToolActParameters = Type.Unsafe<z.infer<typeof computerToolActInput>>(z.toJSONSchema(computerToolActInput, { io: 'input' }));
export const computerToolHandoffParameters = Type.Unsafe<z.infer<typeof computerToolHandoff>>(z.toJSONSchema(computerToolHandoff, { io: 'input' }));
export const computerToolBrowserOpenParameters = Type.Unsafe<z.infer<typeof computerToolBrowserOpen>>(z.toJSONSchema(computerToolBrowserOpen, { io: 'input' }));
export const computerToolBrowserActParameters = Type.Unsafe<z.infer<typeof computerToolBrowserAct>>(z.toJSONSchema(computerToolBrowserAct, { io: 'input' }));
export const computerToolBrowserTabParameters = Type.Unsafe<z.infer<typeof computerToolBrowserTab>>(z.toJSONSchema(computerToolBrowserTab, { io: 'input' }));
