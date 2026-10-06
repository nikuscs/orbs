import { z } from 'zod';

export const jsonString = z.string();
export const jsonValue = z.json();
export const jsonObject = z.record(z.string(), jsonValue);

export type JsonValue = z.infer<typeof jsonValue>;
