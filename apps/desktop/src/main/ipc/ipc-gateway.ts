import { randomUUID } from 'node:crypto';
import { ipcMain, type BrowserWindow } from 'electron';
import { FAILURE_CODES } from '@iterkeep/contracts';
import type { z } from 'zod';
import {
  assertTrustedInvokeSender,
  IpcRateLimiter,
  measureStructuredValue,
} from './ipc-guards.js';

interface Route {
  readonly channel: string;
  readonly request: z.ZodType;
  readonly response: z.ZodType;
  readonly limitBytes: number;
  readonly rateLimit: number;
}

export interface GatewayRequestMeta {
  readonly requestId: string;
  readonly idempotencyKey?: string;
}

const knownCodes = new Set<string>(FAILURE_CODES);
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function requestIdFrom(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const value = (raw as Record<string, unknown>).requestId;
    if (typeof value === 'string' && requestIdPattern.test(value)) return value;
  }
  return randomUUID();
}

function errorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'INTERNAL_ERROR';
  const direct: Record<string, string> = {
    'permission.denied': 'PERMISSION_DENIED',
    'validation.failed': 'VALIDATION_FAILED',
    'payload.too_large': 'PAYLOAD_TOO_LARGE',
    'rate.limited': 'RATE_LIMITED',
    'workspace.already_exists': 'ALREADY_EXISTS',
    'storage.timeout': 'TIMEOUT',
    'storage.unavailable': 'DB_WORKER_UNAVAILABLE',
  };
  const mapped = direct[error.message];
  if (mapped) return mapped;
  if (error.message.startsWith('storage.')) {
    const storageCode = error.message.slice('storage.'.length).toUpperCase();
    if (knownCodes.has(storageCode)) return storageCode;
  }
  return 'INTERNAL_ERROR';
}

function failure(requestId: string, error: unknown) {
  const code = errorCode(error);
  return {
    ok: false as const,
    error: {
      code,
      messageKey: `error.${code.toLowerCase()}`,
      retryable: code === 'DATABASE_BUSY' || code === 'RATE_LIMITED',
      outcome: code === 'TIMEOUT' ? ('unknown' as const) : ('failed' as const),
      details: {},
      retryAfterMs: code === 'RATE_LIMITED' ? 10_000 : null,
    },
    meta: {
      requestId,
      serverTime: new Date().toISOString(),
      protocolVersion: 1 as const,
    },
  };
}

export function registerValidatedIpc(
  route: Route,
  getWindow: () => BrowserWindow | null,
  limiter: IpcRateLimiter,
  listener: (payload: unknown, meta: GatewayRequestMeta) => Promise<unknown>,
): void {
  ipcMain.handle(route.channel, async (event, raw: unknown) => {
    const fallbackRequestId = requestIdFrom(raw);
    try {
      assertTrustedInvokeSender(event, getWindow());
      const bytes = measureStructuredValue(raw, {
        maxDepth: 24,
        maxProperties: 2_000,
      });
      if (bytes > route.limitBytes) throw new Error('payload.too_large');
      limiter.assertAllowed(
        `${event.sender.id}:${route.channel}`,
        route.rateLimit,
      );
      const request = route.request.parse(raw) as {
        requestId: string;
        idempotencyKey?: string;
        payload: unknown;
      };
      const result = {
        ok: true as const,
        data: await listener(request.payload, {
          requestId: request.requestId,
          ...(request.idempotencyKey
            ? { idempotencyKey: request.idempotencyKey }
            : {}),
        }),
        meta: {
          requestId: request.requestId,
          serverTime: new Date().toISOString(),
          protocolVersion: 1 as const,
        },
      };
      return route.response.parse(result);
    } catch (error) {
      return route.response.parse(failure(fallbackRequestId, error));
    }
  });
}
