import fs from 'node:fs';
import { parentPort, threadId, workerData } from 'node:worker_threads';
import { runNativeCompatibilitySmoke } from '@iterkeep/storage-sqlite';

interface NativeSmokeWorkerData {
  readonly databasePath: string;
  readonly migrationPath: string;
  readonly mode: 'native-compatibility-smoke';
  readonly nativeBindingPath: string;
  readonly now: string;
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

if (!parentPort) throw new Error('DB worker requires a parent port');
if (!isNativeSmokeWorkerData(workerData)) {
  throw new Error('Unsupported DB worker bootstrap data');
}

try {
  const result = runNativeCompatibilitySmoke({
    databasePath: workerData.databasePath,
    migrationSql: fs.readFileSync(workerData.migrationPath, 'utf8'),
    nativeBindingPath: workerData.nativeBindingPath,
    now: workerData.now,
  });
  parentPort.postMessage({ ok: true, result: { ...result, threadId } });
} catch (error) {
  parentPort.postMessage({
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    ok: false,
  });
} finally {
  parentPort.close();
}
