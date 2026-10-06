import { z } from 'zod';
import { memorySubject } from './memory.types';

const memoryExtractionSource = z.object({
  role: z.enum(['user', 'assistant']),
  id: z.string(),
  seq: z.int(),
  authorId: z.string(),
  authorName: z.string(),
  endOffset: z.int().nonnegative().nullable().default(null),
  text: z.string(),
});

export const memoryExtractionSources = z.array(memoryExtractionSource);

const memoryExtractionCandidate = z.object({
  merge: z.array(z.object({ id: z.string(), expectedRevision: z.int().positive() })).max(8).optional(),
  id: z.string().nullable(),
  expectedRevision: z.int().positive().nullable(),
  subject: memorySubject,
  text: z.string().trim().min(1).max(500),
  sourceIds: z.array(z.string()).min(1).max(50),
});

export const memoryExtractionResult = z.object({
  changes: z.array(memoryExtractionCandidate).max(8),
  complete: z.boolean(),
  recap: z.string().max(4000),
});

export const memoryExtractionContext = z.object({
  sources: memoryExtractionSources,
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    authorId: z.string(),
    text: z.string(),
  })).default([]),
});
