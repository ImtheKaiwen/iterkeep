import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

export interface NativeCompatibilitySmokeInput {
  readonly databasePath: string;
  readonly migrationSql: string;
  readonly nativeBindingPath: string;
  readonly now: string;
}

export interface NativeCompatibilitySmokeResult {
  readonly addonEntryPath: string;
  readonly databasePath: string;
  readonly foreignKeys: number;
  readonly foreignKeyViolations: number;
  readonly fts5Matches: number;
  readonly journalMode: string;
  readonly jsonFunctionsAvailable: boolean;
  readonly migrationSha256: string;
  readonly quickCheck: string;
  readonly sqliteVersion: string;
  readonly strictTableCount: number;
  readonly synchronous: number;
  readonly userVersion: number;
}

interface CountRow {
  readonly count: number;
}

interface NumberRow {
  readonly value: number;
}

export function runNativeCompatibilitySmoke(
  input: NativeCompatibilitySmokeInput,
): NativeCompatibilitySmokeResult {
  const db = new Database(input.databasePath, {
    nativeBinding: input.nativeBindingPath,
  });
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 3000');
    const journalMode = String(
      db.pragma('journal_mode = WAL', { simple: true }),
    ).toLowerCase();
    db.pragma('synchronous = FULL');

    const migrationSha256 = createHash('sha256')
      .update(input.migrationSql.trimEnd())
      .digest('hex');

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(input.migrationSql);
      db.prepare(
        'INSERT INTO schema_migrations(version,name,sha256,applied_at) VALUES (1,?,?,?)',
      ).run('0001_initial', migrationSha256, input.now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const workspaceId = '00000000-0000-4000-8000-000000000001';
    const inboxId = '00000000-0000-4000-8000-000000000002';
    const taskId = '00000000-0000-4000-8000-000000000003';
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        `INSERT INTO workspaces(id,display_name,inbox_project_id,created_at,updated_at)
         VALUES (?,?,?,?,?)`,
      ).run(
        workspaceId,
        'Native smoke workspace',
        inboxId,
        input.now,
        input.now,
      );
      db.prepare(
        `INSERT INTO projects(id,workspace_id,kind,name,description,slug,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      ).run(
        inboxId,
        workspaceId,
        'inbox',
        'Inbox',
        'Packaged Electron compatibility proof',
        'inbox',
        'active',
        input.now,
        input.now,
      );
      db.prepare(
        `INSERT INTO tasks(id,project_id,title,body_markdown,created_at,updated_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(
        taskId,
        inboxId,
        'Native SQLite sentinel',
        'fts5 electron worker',
        input.now,
        input.now,
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const fts5Matches = db
      .prepare<[], CountRow>(
        `SELECT count(*) AS count FROM search_fts
         WHERE search_fts MATCH 'sentinel'`,
      )
      .get()?.count;
    const foreignKeyViolations = db
      .prepare<
        [],
        CountRow
      >('SELECT count(*) AS count FROM pragma_foreign_key_check')
      .get()?.count;
    const strictTableCount = db
      .prepare<[], CountRow>(
        `SELECT count(*) AS count FROM sqlite_schema
         WHERE type='table' AND sql LIKE '% STRICT'`,
      )
      .get()?.count;

    if (journalMode !== 'wal')
      throw new Error(`Expected WAL, got ${journalMode}`);
    if (fts5Matches !== 1) throw new Error('FTS5 trigger/query smoke failed');
    if (foreignKeyViolations !== 0) throw new Error('Foreign key check failed');
    if (!strictTableCount)
      throw new Error('STRICT table support was not detected');

    return {
      addonEntryPath: input.nativeBindingPath,
      databasePath: input.databasePath,
      foreignKeys: Number(db.pragma('foreign_keys', { simple: true })),
      foreignKeyViolations,
      fts5Matches,
      journalMode,
      jsonFunctionsAvailable:
        db.prepare<[], NumberRow>("SELECT json_valid('{}') AS value").get()
          ?.value === 1,
      migrationSha256,
      quickCheck: String(db.pragma('quick_check', { simple: true })),
      sqliteVersion:
        db
          .prepare<[], { value: string }>('SELECT sqlite_version() AS value')
          .get()?.value ?? 'unknown',
      strictTableCount,
      synchronous: Number(db.pragma('synchronous', { simple: true })),
      userVersion: Number(db.pragma('user_version', { simple: true })),
    };
  } finally {
    db.close();
  }
}
