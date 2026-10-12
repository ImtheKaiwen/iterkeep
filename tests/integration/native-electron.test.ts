import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('IP-02 native Electron compatibility contract', () => {
  it('keeps the executable migration identical to the DOC-09 SQL block', async () => {
    const documentation = await fs.readFile(
      path.join(root, 'docs/09-DATABASE-SCHEMA.md'),
      'utf8',
    );
    const migration = await fs.readFile(
      path.join(root, 'packages/storage-sqlite/migrations/0001_initial.sql'),
      'utf8',
    );
    const documentedSql = documentation.match(
      /```sql\r?\n(-- iterkeep V1 baseline[\s\S]*?PRAGMA user_version = 1;)\r?\n```/,
    )?.[1];

    expect(documentedSql).toBeDefined();
    expect(migration.replaceAll('\r\n', '\n').trimEnd()).toBe(
      documentedSql?.replaceAll('\r\n', '\n'),
    );
    expect(createHash('sha256').update(migration.trimEnd()).digest('hex')).toBe(
      'fc5d02ff2ff5ff76c786a9e8a1575bfda1b0b3c5b9b53a935cf95a7709a8eff5',
    );
  });

  it('builds dedicated CommonJS entries for main, preload, and DB worker', async () => {
    const manifest = JSON.parse(
      await fs.readFile(path.join(root, 'apps/desktop/package.json'), 'utf8'),
    );
    const forge = await fs.readFile(
      path.join(root, 'apps/desktop/forge.config.ts'),
      'utf8',
    );

    expect(manifest.main).toBe('.vite/build/main.cjs');
    expect(forge).toContain("entry: 'src/workers/db.worker.ts'");
    expect(forge).toContain('AutoUnpackNativesPlugin');
  });
});
