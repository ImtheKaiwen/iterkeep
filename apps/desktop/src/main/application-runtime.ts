import { randomUUID } from 'node:crypto';
import {
  ApplicationCore,
  type CoreRepositoryPort,
} from '@iterkeep/application';
import { hashCommandPayload } from '@iterkeep/storage-sqlite';
import type { DatabaseClient } from './setup-ipc.js';

function repositoryProxy(database: DatabaseClient): CoreRepositoryPort {
  return new Proxy({} as CoreRepositoryPort, {
    get: (_target, property) => {
      if (typeof property !== 'string') return undefined;
      return (input?: unknown) =>
        database.request('core.repository', {
          method: property,
          input: input ?? {},
        });
    },
  });
}

export function createApplicationCore(
  database: DatabaseClient,
): ApplicationCore {
  return new ApplicationCore({
    repository: repositoryProxy(database),
    clock: {
      now: () => new Date().toISOString(),
      receiptExpiresAt: () =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
    },
    ids: { next: () => randomUUID() },
    hasher: { hash: hashCommandPayload },
  });
}
