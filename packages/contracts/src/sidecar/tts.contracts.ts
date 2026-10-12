import { z } from 'zod';
import { JobIdSchema, UuidV4Schema } from '../shared/value-schemas.js';

const TtsErrorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/);

export const TtsSidecarEventSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('ready'),
    requestId: UuidV4Schema,
    runtime: z.literal('ema-lightning'),
    device: z.enum(['cpu', 'cuda']),
  }),
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('started'),
    jobId: JobIdSchema,
  }),
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('playing'),
    jobId: JobIdSchema,
    progressMs: z.number().int().min(0),
  }),
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('ended'),
    jobId: JobIdSchema,
    playedMs: z.number().int().min(0),
  }),
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('cancelled'),
    jobId: JobIdSchema,
  }),
  z.strictObject({
    v: z.literal(1),
    kind: z.literal('error'),
    jobId: JobIdSchema,
    code: TtsErrorCodeSchema,
  }),
]);
