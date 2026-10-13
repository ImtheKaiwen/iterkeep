import {
  ApiErrorSchema,
  PROJECT_ROUTES,
  ProjectCreateRequest,
  TASK_ROUTES,
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

  it('validates project and task route envelopes and responses strictly', () => {
    const projectId = '3ba16859-283e-4b9b-b72e-2b2908f50f33';
    expect(
      PROJECT_ROUTES.changeStatus.request.safeParse({
        ...requestMeta,
        payload: { projectId, status: 'paused', expectedRevision: 2 },
      }).success,
    ).toBe(true);
    expect(
      TASK_ROUTES.move.request.safeParse({
        ...requestMeta,
        payload: {
          taskId: '8cdd67c5-99d4-4d61-9f32-991442568770',
          projectId,
          expectedRevision: 3,
          sortOrder: 1,
          actor: 'forged',
        },
      }).success,
    ).toBe(false);
    expect(
      PROJECT_ROUTES.get.response.safeParse({
        ok: true,
        data: {
          id: projectId,
          workspaceId: 'cb82d16f-9633-408f-9430-519d7f887663',
          kind: 'user',
          name: 'Project',
          description: '',
          status: 'active',
          priority: 'none',
          tagIds: [],
          revision: 1,
          deletedAt: null,
          secret: true,
        },
        meta: {
          requestId: requestMeta.requestId,
          serverTime: '2026-10-13T00:00:00.000Z',
          protocolVersion: 1,
        },
      }).success,
    ).toBe(false);

    const taskIds = Array.from(
      { length: 251 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    );
    expect(
      TASK_ROUTES.reorder.request.safeParse({
        ...requestMeta,
        payload: {
          projectId,
          status: 'todo',
          orderedTaskIds: taskIds,
          expectedRevisions: Object.fromEntries(taskIds.map((id) => [id, 1])),
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
