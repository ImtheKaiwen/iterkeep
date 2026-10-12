import {
  ApiErrorSchema,
  ProjectCreateRequest,
  SafeDetailsSchema,
  TaskCreateRequest,
  TtsSidecarEventSchema,
} from '@iterkeep/contracts';
import { describe, expect, it } from 'vitest';

const requestMeta = {
  protocolVersion: 1 as const,
  requestId: 'd2b18e55-e9c8-4e2c-b19d-47aa6c86f002',
  idempotencyKey: '3812d45e-7629-4e08-bf87-b332a8a1c1c9',
};

describe('IP-03 trust-boundary schemas', () => {
  it('accepts a valid named task mutation', () => {
    expect(
      TaskCreateRequest.safeParse({
        ...requestMeta,
        payload: { title: 'Memory modülünü test et' },
      }).success,
    ).toBe(true);
  });

  it.each(['actor', 'approved', 'sql', 'dbPath'])(
    'rejects forged %s authority',
    (field) => {
      expect(
        TaskCreateRequest.safeParse({
          ...requestMeta,
          payload: {
            title: 'Task',
            [field]: field === 'approved' ? true : 'forged',
          },
        }).success,
      ).toBe(false);
    },
  );

  it('keeps idempotency authority in the envelope', () => {
    expect(
      ProjectCreateRequest.safeParse({
        ...requestMeta,
        payload: {
          name: 'Project',
          idempotencyKey: requestMeta.idempotencyKey,
        },
      }).success,
    ).toBe(false);
  });

  it('denies sensitive error details and arbitrary failure codes', () => {
    expect(SafeDetailsSchema.safeParse({ sql: 'select secret' }).success).toBe(
      false,
    );
    expect(
      ApiErrorSchema.safeParse({
        code: 'MADE_UP',
        messageKey: 'errors.internal',
        retryable: false,
        outcome: 'failed',
        details: {},
        retryAfterMs: null,
      }).success,
    ).toBe(false);
  });

  it('validates the private TTS sidecar union strictly', () => {
    const event = {
      v: 1,
      kind: 'playing',
      jobId: 'bcb9f38b-cf43-456d-950d-f294780fabdd',
      progressMs: 120,
    };
    expect(TtsSidecarEventSchema.safeParse(event).success).toBe(true);
    expect(
      TtsSidecarEventSchema.safeParse({ ...event, text: 'private content' })
        .success,
    ).toBe(false);
  });
});
