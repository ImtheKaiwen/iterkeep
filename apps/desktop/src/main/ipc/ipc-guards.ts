import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

export function assertTrustedInvokeSender(
  event: IpcMainInvokeEvent,
  window: BrowserWindow | null,
): void {
  if (
    !window ||
    window.isDestroyed() ||
    event.sender !== window.webContents ||
    !event.senderFrame ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url !== window.webContents.getURL()
  ) {
    throw new Error('permission.denied');
  }
}

export function measureStructuredValue(
  value: unknown,
  limits: { readonly maxDepth: number; readonly maxProperties: number },
): number {
  let properties = 0;
  const seen = new Set<object>();
  const visit = (candidate: unknown, depth: number): number => {
    if (depth > limits.maxDepth) throw new Error('payload.too_large');
    if (candidate === null || candidate === undefined) return 4;
    if (typeof candidate === 'string')
      return new TextEncoder().encode(candidate).byteLength;
    if (typeof candidate === 'number' || typeof candidate === 'boolean')
      return 8;
    if (candidate instanceof Uint8Array) return candidate.byteLength;
    if (typeof candidate !== 'object') throw new Error('validation.failed');
    if (seen.has(candidate)) throw new Error('validation.failed');
    seen.add(candidate);
    let bytes = 0;
    for (const [key, child] of Object.entries(candidate)) {
      properties += 1;
      if (properties > limits.maxProperties)
        throw new Error('payload.too_large');
      bytes +=
        new TextEncoder().encode(key).byteLength + visit(child, depth + 1);
    }
    seen.delete(candidate);
    return bytes;
  };
  return visit(value, 0);
}

export class IpcRateLimiter {
  readonly #buckets = new Map<string, { count: number; startedAt: number }>();

  assertAllowed(key: string, maximum: number, now = Date.now()): void {
    const current = this.#buckets.get(key);
    if (!current || now - current.startedAt >= 10_000) {
      this.#buckets.set(key, { count: 1, startedAt: now });
      return;
    }
    if (current.count >= maximum) throw new Error('rate.limited');
    current.count += 1;
  }

  clearSender(senderId: number): void {
    const prefix = `${senderId}:`;
    for (const key of this.#buckets.keys()) {
      if (key.startsWith(prefix)) this.#buckets.delete(key);
    }
  }
}
