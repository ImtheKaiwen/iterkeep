import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const executable = path.join(
  root,
  'apps',
  'desktop',
  'out',
  'Iterkeep-win32-x64',
  'Iterkeep.exe',
);
const runId = randomUUID();
const runDirectory = path.join(os.tmpdir(), 'iterkeep-native-smoke', runId);
const reportPath = path.join(runDirectory, 'report.json');
const electronEnvironment = { ...process.env };
delete electronEnvironment.ELECTRON_RUN_AS_NODE;

await fs.access(executable);
const execution = spawnSync(executable, [`iterkeep-native-smoke:${runId}`], {
  encoding: 'utf8',
  env: electronEnvironment,
  timeout: 120_000,
  windowsHide: true,
});
if (execution.error) throw execution.error;
if (execution.status !== 0) {
  throw new Error(
    `Packaged Electron smoke exited ${String(execution.status)}: ${execution.stderr}`,
  );
}

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const result = report.result;
if (result?.ok !== true) {
  throw new Error(`Native worker failed: ${String(result?.error)}`);
}
const proof = result.result;
const expectations = {
  foreignKeys: 1,
  foreignKeyViolations: 0,
  fts5Matches: 1,
  journalMode: 'wal',
  jsonFunctionsAvailable: true,
  quickCheck: 'ok',
  synchronous: 2,
  userVersion: 1,
};
for (const [key, expected] of Object.entries(expectations)) {
  if (proof?.[key] !== expected) {
    throw new Error(
      `Native smoke expected ${key}=${String(expected)}, got ${String(proof?.[key])}`,
    );
  }
}

const unpackedRoot = path.join(
  root,
  'apps',
  'desktop',
  'out',
  'Iterkeep-win32-x64',
  'resources',
  'app.asar.unpacked',
);
async function findNativeAddon(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findNativeAddon(absolute);
      if (found) return found;
    } else if (entry.name === 'win32-x64.node') {
      return absolute;
    }
  }
  return undefined;
}
const nativeAddonPath = await findNativeAddon(unpackedRoot);
if (!nativeAddonPath) throw new Error('Native addon is not outside app.asar');

const evidence = {
  ...report,
  executable,
  nativeAddonPath,
  status: 'PASS',
};
const evidenceDirectory = path.join(root, '.artifacts', 'ip-02');
await fs.mkdir(evidenceDirectory, { recursive: true });
await fs.writeFile(
  path.join(evidenceDirectory, 'native-smoke.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
await fs.rm(runDirectory, { recursive: true, force: true });
