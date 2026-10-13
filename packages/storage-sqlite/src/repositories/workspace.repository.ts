import type Database from 'better-sqlite3';
import { inImmediateTransaction } from '../operations/transaction.js';

export interface BootstrapWorkspaceCommand {
  readonly workspaceId: string;
  readonly inboxProjectId: string;
  readonly displayName: string;
  readonly locale?: 'tr-TR' | 'en-US';
  readonly theme?: 'system' | 'light' | 'dark';
  readonly timezone: string;
  readonly now: string;
}

export interface WorkspaceRecord {
  readonly id: string;
  readonly displayName: string;
  readonly inboxProjectId: string;
  readonly schemaCompatibilityVersion: number;
  readonly revision: number;
  readonly locale: 'tr-TR' | 'en-US';
  readonly theme: 'system' | 'light' | 'dark';
  readonly timezone: string;
}

interface WorkspaceRow {
  readonly id: string;
  readonly display_name: string;
  readonly inbox_project_id: string;
  readonly schema_compatibility_version: number;
  readonly revision: number;
  readonly locale: WorkspaceRecord['locale'];
  readonly theme: WorkspaceRecord['theme'];
  readonly timezone: string;
}

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    inboxProjectId: row.inbox_project_id,
    schemaCompatibilityVersion: row.schema_compatibility_version,
    revision: row.revision,
    locale: row.locale,
    theme: row.theme,
    timezone: row.timezone,
  };
}

export function bootstrapWorkspace(
  db: Database.Database,
  command: BootstrapWorkspaceCommand,
  failpoint?: 'after_workspace',
): WorkspaceRecord {
  return inImmediateTransaction(db, () => {
    db.prepare(
      `INSERT INTO workspaces
       (id,display_name,inbox_project_id,created_at,updated_at)
       VALUES (?,?,?,?,?)`,
    ).run(
      command.workspaceId,
      command.displayName,
      command.inboxProjectId,
      command.now,
      command.now,
    );
    if (failpoint === 'after_workspace') throw new Error('TEST_FAILPOINT');
    db.prepare(
      `INSERT INTO projects
       (id,workspace_id,kind,name,description,slug,status,created_at,updated_at)
       VALUES (?,?,'inbox','Inbox','','inbox','active',?,?)`,
    ).run(
      command.inboxProjectId,
      command.workspaceId,
      command.now,
      command.now,
    );
    db.prepare(
      `INSERT INTO workspace_preferences(workspace_id,locale,theme,timezone)
       VALUES (?,?,?,?)`,
    ).run(
      command.workspaceId,
      command.locale ?? 'tr-TR',
      command.theme ?? 'system',
      command.timezone,
    );
    db.prepare(
      `INSERT INTO setup_state(workspace_id,updated_at) VALUES (?,?)`,
    ).run(command.workspaceId, command.now);
    const preference = db.prepare(
      `INSERT INTO feature_preferences
       (workspace_id,feature,preference,updated_at)
       VALUES (? ,?,'disabled',?)`,
    );
    for (const feature of ['ai', 'stt', 'tts', 'git']) {
      preference.run(command.workspaceId, feature, command.now);
    }
    return readWorkspace(db);
  });
}

export function readWorkspace(db: Database.Database): WorkspaceRecord {
  const row = db
    .prepare<[], WorkspaceRow>(
      `SELECT w.id,w.display_name,w.inbox_project_id,
              w.schema_compatibility_version,w.revision,
              p.locale,p.theme,p.timezone
       FROM workspaces w
       JOIN workspace_preferences p ON p.workspace_id=w.id`,
    )
    .get();
  if (!row) throw new Error('WORKSPACE_UNAVAILABLE');
  return mapWorkspace(row);
}
