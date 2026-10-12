import fs from 'node:fs';
import { parentPort, threadId, workerData } from 'node:worker_threads';
import { runNativeCompatibilitySmoke } from '@iterkeep/storage-sqlite';
import { DatabaseWorkerRuntime } from './db-worker-runtime.js';

const INITIAL_MIGRATION_SHA256 =
  'fc5d02ff2ff5ff76c786a9e8a1575bfda1b0b3c5b9b53a935cf95a7709a8eff5';

interface NativeSmokeWorkerData {
  readonly databasePath: string;
  readonly migrationPath: string;
  readonly mode: 'native-compatibility-smoke';
  readonly nativeBindingPath: string;
  readonly now: string;
}

interface DatabaseWorkerData {
  readonly databasePath: string;
  readonly migrationPath: string;
  readonly mode: 'database';
  readonly nativeBindingPath?: string;
  readonly appliedAt: string;
  readonly intent: 'open_existing' | 'create_new';
}

function isNativeSmokeWorkerData(
  value: unknown,
): value is NativeSmokeWorkerData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.mode === 'native-compatibility-smoke' &&
    typeof candidate.databasePath === 'string' &&
    typeof candidate.migrationPath === 'string' &&
    typeof candidate.nativeBindingPath === 'string' &&
    typeof candidate.now === 'string'
  );
}

function isDatabaseWorkerData(value: unknown): value is DatabaseWorkerData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.mode === 'database' &&
    typeof candidate.databasePath === 'string' &&
    typeof candidate.migrationPath === 'string' &&
    typeof candidate.appliedAt === 'string' &&
    (candidate.intent === 'open_existing' ||
      candidate.intent === 'create_new') &&
    (candidate.nativeBindingPath === undefined ||
      typeof candidate.nativeBindingPath === 'string')
  );
}

if (!parentPort) throw new Error('DB worker requires a parent port');
const workerPort = parentPort;

if (isNativeSmokeWorkerData(workerData)) {
  try {
    const result = runNativeCompatibilitySmoke({
      databasePath: workerData.databasePath,
      migrationSql: fs.readFileSync(workerData.migrationPath, 'utf8'),
      nativeBindingPath: workerData.nativeBindingPath,
      now: workerData.now,
    });
    workerPort.postMessage({ ok: true, result: { ...result, threadId } });
  } catch (error) {
    workerPort.postMessage({
      error:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      ok: false,
    });
  } finally {
    workerPort.close();
  }
} else if (isDatabaseWorkerData(workerData)) {
  const migrationSql = fs.readFileSync(workerData.migrationPath, 'utf8');
  const runtime = new DatabaseWorkerRuntime({
    databasePath: workerData.databasePath,
    intent: workerData.intent,
    migration: {
      version: 1,
      name: '0001_initial',
      sql: migrationSql,
      sha256: INITIAL_MIGRATION_SHA256,
    },
    appliedAt: workerData.appliedAt,
    ...(workerData.nativeBindingPath
      ? { nativeBindingPath: workerData.nativeBindingPath }
      : {}),
  });
  let queue = Promise.resolve();
  workerPort.on('message', (message: unknown) => {
    queue = queue.then(async () => {
      workerPort.postMessage(await runtime.handle(message));
    });
  });
  workerPort.once('close', () => runtime.close());
  workerPort.postMessage({ kind: 'ready', protocolVersion: 1, threadId });
} else {
  throw new Error('Unsupported DB worker bootstrap data');
}
