import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = [
  'apps/desktop/out',
  'apps/desktop/.vite/build/main.cjs',
  'apps/desktop/.vite/build/preload.cjs',
  'apps/desktop/.vite/build/db.worker.cjs',
  'apps/desktop/.vite/renderer/main_window/index.html',
];
const missing = [];

async function findFile(directory, basename) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findFile(absolute, basename);
      if (found) return found;
    } else if (entry.name === basename) {
      return absolute;
    }
  }
  return undefined;
}

for (const relative of required) {
  try {
    await fs.access(path.join(root, relative));
  } catch {
    missing.push(relative);
  }
}

const nativeAddon = await findFile(
  path.join(root, 'apps/desktop/out'),
  'win32-x64.node',
);
if (!nativeAddon?.includes('app.asar.unpacked')) {
  missing.push('unpacked win32-x64.node');
}

if (missing.length > 0) {
  process.stderr.write(
    `BLOCKED: packaged artifact is missing:\n${missing.join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write('PASS artifact layout\n');
}
