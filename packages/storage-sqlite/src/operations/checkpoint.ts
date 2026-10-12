import type Database from 'better-sqlite3';

export interface CheckpointResult {
  readonly busy: number;
  readonly log: number;
  readonly checkpointed: number;
}

export function passiveCheckpoint(db: Database.Database): CheckpointResult {
  const rows = db.pragma('wal_checkpoint(PASSIVE)') as CheckpointResult[];
  const row = rows[0];
  if (!row) throw new Error('CHECKPOINT_FAILED');
  return row;
}
