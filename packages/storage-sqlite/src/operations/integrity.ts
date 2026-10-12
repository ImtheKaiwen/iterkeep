import type Database from 'better-sqlite3';

export interface IntegrityReport {
  readonly quickCheck: string;
  readonly foreignKeyViolations: number;
  readonly workspaceId: string;
  readonly inboxProjectId: string;
}

export function verifyDatabaseIntegrity(
  db: Database.Database,
): IntegrityReport {
  const quickCheck = String(db.pragma('quick_check', { simple: true }));
  if (quickCheck !== 'ok') throw new Error('DATABASE_CORRUPT');
  const foreignKeyViolations = (db.pragma('foreign_key_check') as unknown[])
    .length;
  if (foreignKeyViolations !== 0) throw new Error('REFERENTIAL_INTEGRITY');
  const workspace = db
    .prepare<
      [],
      { id: string; inbox_project_id: string }
    >('SELECT id,inbox_project_id FROM workspaces')
    .all();
  if (workspace.length !== 1 || !workspace[0]) {
    throw new Error('WORKSPACE_INVARIANT');
  }
  const inbox = db
    .prepare<[string, string], { id: string }>(
      `SELECT id FROM projects
       WHERE id=? AND workspace_id=? AND kind='inbox'
         AND status='active' AND deleted_at IS NULL`,
    )
    .get(workspace[0].inbox_project_id, workspace[0].id);
  if (!inbox) throw new Error('INBOX_INVARIANT');
  return {
    quickCheck,
    foreignKeyViolations,
    workspaceId: workspace[0].id,
    inboxProjectId: workspace[0].inbox_project_id,
  };
}

export function verifyFullIntegrity(db: Database.Database): void {
  const rows = db.pragma('integrity_check') as Array<{
    readonly integrity_check: string;
  }>;
  if (rows.length !== 1 || rows[0]?.integrity_check !== 'ok') {
    throw new Error('DATABASE_CORRUPT');
  }
  if ((db.pragma('foreign_key_check') as unknown[]).length !== 0) {
    throw new Error('REFERENTIAL_INTEGRITY');
  }
}
