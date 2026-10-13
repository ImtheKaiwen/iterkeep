import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { IPC_ROUTE_COUNT, IPC_ROUTES, SETUP_ROUTES } from '@iterkeep/contracts';
import type {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents,
  WebFrameMain,
} from 'electron';
import { handleValidatedIpc } from '../../apps/desktop/src/main/ipc/ipc-gateway.js';
import {
  IpcRateLimiter,
  measureStructuredValue,
} from '../../apps/desktop/src/main/ipc/ipc-guards.js';

describe('IPC gateway guards', () => {
  function trustedHarness(url = 'file:///iterkeep/index.html') {
    const frame = { url } as WebFrameMain;
    const sender = {
      id: 7,
      mainFrame: frame,
      getURL: () => url,
    } as WebContents;
    const window = {
      isDestroyed: () => false,
      webContents: sender,
    } as BrowserWindow;
    const event = { sender, senderFrame: frame } as IpcMainInvokeEvent;
    return { event, frame, sender, window };
  }

  function request(payload: unknown, protocolVersion = 1) {
    return { protocolVersion, requestId: randomUUID(), payload };
  }

  it('uses versioned, statically named channels', () => {
    const channels = Object.values(IPC_ROUTES).map((route) => route.channel);
    expect(channels).toHaveLength(IPC_ROUTE_COUNT);
    expect(new Set(channels).size).toBe(channels.length);
    expect(
      channels.every((channel) => channel.startsWith('iterkeep:v1:')),
    ).toBe(true);
  });

  it('matches every canonical DOC-11 invoke channel', async () => {
    const document = await fs.readFile('docs/11-IPC-CONTRACTS.md', 'utf8');
    const documented = [
      ...document.matchAll(/^\| `[^`]+\(\)` \| `([^`]+)` \|/gmu),
    ]
      .map((match) => `iterkeep:v1:${match[1]}`)
      .sort();
    const implemented = Object.values(IPC_ROUTES)
      .map((route) => route.channel)
      .sort();
    expect(documented).toHaveLength(IPC_ROUTE_COUNT);
    expect(implemented).toEqual(documented);
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

  it('accepts a trusted valid call and preserves its request id', async () => {
    const harness = trustedHarness();
    const raw = request({});
    const listener = vi.fn(async () => ({
      workspaceReady: false,
      workspace: null,
      setup: null,
    }));
    const result = await handleValidatedIpc(
      SETUP_ROUTES.systemBootstrap,
      harness.event,
      harness.window,
      new IpcRateLimiter(),
      listener,
      raw,
    );
    expect(result).toMatchObject({
      ok: true,
      meta: { requestId: raw.requestId, protocolVersion: 1 },
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'missing window',
      (h: ReturnType<typeof trustedHarness>) => ({ ...h, window: null }),
    ],
    [
      'other BrowserWindow sender',
      (h: ReturnType<typeof trustedHarness>) => ({
        ...h,
        event: { ...h.event, sender: { ...h.sender, id: 8 } },
      }),
    ],
    [
      'iframe sender',
      (h: ReturnType<typeof trustedHarness>) => ({
        ...h,
        event: { ...h.event, senderFrame: { url: h.frame.url } },
      }),
    ],
    [
      'wrong origin',
      (h: ReturnType<typeof trustedHarness>) => ({
        ...h,
        event: {
          ...h.event,
          senderFrame: { ...h.frame, url: 'https://attacker.invalid' },
        },
      }),
    ],
  ])('rejects %s', async (_name, alter) => {
    const changed = alter(trustedHarness());
    const result = await handleValidatedIpc(
      SETUP_ROUTES.systemBootstrap,
      changed.event as IpcMainInvokeEvent,
      changed.window as BrowserWindow | null,
      new IpcRateLimiter(),
      async () => ({ workspaceReady: false, workspace: null, setup: null }),
      request({}),
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'PERMISSION_DENIED' },
    });
  });

  it('returns typed failures for invalid versions, schemas, oversized payloads, and spam', async () => {
    const harness = trustedHarness();
    const invoke = (raw: unknown, limiter = new IpcRateLimiter()) =>
      handleValidatedIpc(
        SETUP_ROUTES.systemBootstrap,
        harness.event,
        harness.window,
        limiter,
        async () => ({ workspaceReady: false, workspace: null, setup: null }),
        raw,
      );

    await expect(invoke(request({}, 2))).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNSUPPORTED_PROTOCOL' },
    });
    await expect(
      invoke({ ...request({}), forged: true }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_FAILED' },
    });
    await expect(
      invoke(request({ text: 'x'.repeat(140_000) })),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'PAYLOAD_TOO_LARGE' },
    });

    const limiter = new IpcRateLimiter();
    for (
      let index = 0;
      index < SETUP_ROUTES.systemBootstrap.rateLimit;
      index += 1
    ) {
      await invoke(request({}), limiter);
    }
    await expect(invoke(request({}), limiter)).resolves.toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', retryable: true },
    });
  });
});
