import type Database from 'better-sqlite3';
import { StorageError } from '../errors.js';
import { inImmediateTransaction } from '../operations/transaction.js';

export interface SetupStateRecord {
  readonly workspaceId: string;
  readonly coreSetupCompleted: boolean;
  readonly lastCompletedStep: string | null;
  readonly aiSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly voiceSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly updatedAt: string;
  readonly revision: number;
}

interface SetupRow {
  workspace_id: string;
  core_setup_completed: number;
  last_completed_step: string | null;
  ai_setup_choice: SetupStateRecord['aiSetupChoice'];
  voice_setup_choice: SetupStateRecord['voiceSetupChoice'];
  updated_at: string;
  revision: number;
}

function mapSetup(row: SetupRow): SetupStateRecord {
  return {
    workspaceId: row.workspace_id,
    coreSetupCompleted: row.core_setup_completed === 1,
    lastCompletedStep: row.last_completed_step,
    aiSetupChoice: row.ai_setup_choice,
    voiceSetupChoice: row.voice_setup_choice,
    updatedAt: row.updated_at,
    revision: row.revision,
  };
}

export function readSetupState(db: Database.Database): SetupStateRecord {
  const row = db
    .prepare<[], SetupRow>(
      `SELECT workspace_id,core_setup_completed,last_completed_step,
              ai_setup_choice,voice_setup_choice,updated_at,revision
       FROM setup_state`,
    )
    .get();
  if (!row) throw new StorageError('NOT_FOUND');
  return mapSetup(row);
}

export function saveSetupStep(
  db: Database.Database,
  input: {
    step: string;
    aiSetupChoice?: SetupStateRecord['aiSetupChoice'] | undefined;
    voiceSetupChoice?: SetupStateRecord['voiceSetupChoice'] | undefined;
    expectedRevision: number;
    now: string;
  },
): SetupStateRecord {
  return inImmediateTransaction(db, () => {
    const update = db
      .prepare(
        `UPDATE setup_state
         SET last_completed_step=?,ai_setup_choice=COALESCE(?,ai_setup_choice),
             voice_setup_choice=COALESCE(?,voice_setup_choice),updated_at=?,revision=revision+1
         WHERE revision=? AND core_setup_completed=0`,
      )
      .run(
        input.step,
        input.aiSetupChoice ?? null,
        input.voiceSetupChoice ?? null,
        input.now,
        input.expectedRevision,
      );
    if (update.changes !== 1) throw new StorageError('CONFLICT_REVISION');
    return readSetupState(db);
  });
}

export function completeSetup(
  db: Database.Database,
  input: { expectedRevision: number; now: string },
): SetupStateRecord {
  return inImmediateTransaction(db, () => {
    const workspace = db
      .prepare<[], { valid: number }>(
        `SELECT EXISTS(
           SELECT 1 FROM workspaces w JOIN projects p ON p.id=w.inbox_project_id
           WHERE p.kind='inbox' AND p.deleted_at IS NULL
         ) AS valid`,
      )
      .get();
    if (workspace?.valid !== 1) throw new StorageError('NOT_FOUND');
    const update = db
      .prepare(
        `UPDATE setup_state SET core_setup_completed=1,last_completed_step='finish',
         updated_at=?,revision=revision+1 WHERE revision=?`,
      )
      .run(input.now, input.expectedRevision);
    if (update.changes !== 1) throw new StorageError('CONFLICT_REVISION');
    return readSetupState(db);
  });
}
