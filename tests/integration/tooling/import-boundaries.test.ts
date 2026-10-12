import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('renderer import boundary', () => {
  it('rejects Node imports in renderer source', () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), 'scripts/check-import-boundaries.mjs'),
        path.join(process.cwd(), 'tests/fixtures/boundaries'),
      ],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('renderer cannot import "node:fs"');
  });
});
