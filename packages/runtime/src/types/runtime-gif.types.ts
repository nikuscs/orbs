import { Type } from '@earendil-works/pi-ai';
import { gifToolCall } from '@repo/contracts/universal';
import { z } from 'zod';

export const runtimeGifToolParameters = Type.Unsafe<z.infer<typeof gifToolCall>>(z.toJSONSchema(gifToolCall));
