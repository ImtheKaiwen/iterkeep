import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

const smokeArgumentPrefix = 'iterkeep-native-smoke:';
const runIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getNativeSmokeRunId(
  argv: readonly string[],
): string | undefined {
  const argument = argv.find((value) => value.startsWith(smokeArgumentPrefix));
  if (!argument) return undefined;
  const runId = argument.slice(smokeArgumentPrefix.length);
  if (!runIdPattern.test(runId)) throw new Error('Invalid native smoke run id');
  return runId;
}

export async function runPackagedNativeSmoke(
  runId: string,
  resourcesPath: string,
  workerPath: string,
): Promise<void> {
  const runDirectory = path.join(os.tmpdir(), 'iterkeep-native-smoke', runId);
  const databasePath = path.join(runDirectory, 'native-smoke.sqlite3');
  const migrationPath = path.join(
    resourcesPath,
    'migrations',
    '0001_initial.sql',
  );
  await fs.mkdir(runDirectory, { recursive: true });

  const result = await new Promise<unknown>((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: {
        databasePath,
        migrationPath,
        mode: 'native-compatibility-smoke',
        nativeBindingPath: path.join(
          path.dirname(workerPath),
          'win32-x64.node',
        ),
        now: new Date().toISOString(),
      },
    });
    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error('DB worker native smoke timed out'));
    }, 30_000);
    worker.once('message', (message) => {
      clearTimeout(timeout);
      resolve(message);
    });
    worker.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`DB worker exited with code ${code}`));
    });
  });

  await fs.writeFile(
    path.join(runDirectory, 'report.json'),
    `${JSON.stringify({ electron: process.versions.electron, result }, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
}
