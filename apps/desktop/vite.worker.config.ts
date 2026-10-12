import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'copy-better-sqlite3-windows-x64',
      async writeBundle(options) {
        if (!options.dir)
          throw new Error('Worker output directory is required');
        const source = fileURLToPath(
          new URL(
            '../../node_modules/better-sqlite3/prebuilds/win32-x64.node',
            import.meta.url,
          ),
        );
        await fs.copyFile(source, path.join(options.dir, 'win32-x64.node'));
      },
    },
  ],
  build: {
    rollupOptions: { output: { entryFileNames: 'db.worker.cjs' } },
    sourcemap: true,
  },
});
