import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = [
  'apps/desktop/out',
  'apps/desktop/.vite/build/main.js',
  'apps/desktop/.vite/build/preload.js',
  'apps/desktop/.vite/renderer/main_window/index.html',
];
const missing = [];

for (const relative of required) {
  try {
    await fs.access(path.join(root, relative));
  } catch {
    missing.push(relative);
  }
}

if (missing.length > 0) {
  process.stderr.write(
    `BLOCKED: packaged artifact is missing:\n${missing.join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write('PASS artifact layout\n');
}
