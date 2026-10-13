import { describe, expect, it } from 'vitest';
import { PROJECT_ROUTES, SETUP_ROUTES, TASK_ROUTES } from '@iterkeep/contracts';
import {
  IpcRateLimiter,
  measureStructuredValue,
} from '../../apps/desktop/src/main/ipc/ipc-guards.js';

describe('IPC gateway guards', () => {
  it('uses versioned, statically named channels', () => {
    const channels = [
      ...Object.values(SETUP_ROUTES),
      ...Object.values(PROJECT_ROUTES),
      ...Object.values(TASK_ROUTES),
    ].map((route) => route.channel);
    expect(new Set(channels).size).toBe(channels.length);
    expect(
      channels.every((channel) => channel.startsWith('iterkeep:v1:')),
    ).toBe(true);
  });

  it('rejects excessive depth, property counts, and cycles before parsing', () => {
    expect(() =>
      measureStructuredValue(
        { a: { b: { c: true } } },
        {
          maxDepth: 1,
          maxProperties: 10,
        },
      ),
    ).toThrow('payload.too_large');
    expect(() =>
      measureStructuredValue(
        { a: 1, b: 2 },
        {
          maxDepth: 4,
          maxProperties: 1,
        },
      ),
    ).toThrow('payload.too_large');
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() =>
      measureStructuredValue(cyclic, { maxDepth: 4, maxProperties: 10 }),
    ).toThrow('validation.failed');
  });

  it('rate limits each sender and channel independently', () => {
    const limiter = new IpcRateLimiter();
    limiter.assertAllowed('7:route-a', 2, 1_000);
    limiter.assertAllowed('7:route-a', 2, 1_001);
    expect(() => limiter.assertAllowed('7:route-a', 2, 1_002)).toThrow(
      'rate.limited',
    );
    expect(() => limiter.assertAllowed('8:route-a', 2, 1_002)).not.toThrow();
    limiter.clearSender(7);
    expect(() => limiter.assertAllowed('7:route-a', 2, 1_003)).not.toThrow();
  });
});
