import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { verifyFullIntegrity } from './integrity.js';

export async function createConsistentBackup(
  db: Database.Database,
  finalPath: string,
  nativeBinding?: string,
): Promise<void> {
  const temporaryPath = `${finalPath}.partial-${randomUUID()}`;
  await mkdir(dirname(finalPath), { recursive: true });
  try {
    await db.backup(temporaryPath);
    const firstVerifier = new Database(temporaryPath, {
      fileMustExist: true,
      nativeBinding,
      readonly: true,
    });
    try {
      firstVerifier.pragma('foreign_keys = ON');
      verifyFullIntegrity(firstVerifier);
    } finally {
      firstVerifier.close();
    }

    // WAL mode is persistent. Normalize the staged copy to a self-contained
    // database before publishing it, then verify that final representation.
    const normalizer = new Database(temporaryPath, {
      fileMustExist: true,
      nativeBinding,
    });
    try {
      normalizer.pragma('wal_checkpoint(TRUNCATE)');
      normalizer.pragma('journal_mode = DELETE');
    } finally {
      normalizer.close();
    }
    await rm(`${temporaryPath}-wal`, { force: true });
    await rm(`${temporaryPath}-shm`, { force: true });
    const verifier = new Database(temporaryPath, {
      fileMustExist: true,
      nativeBinding,
      readonly: true,
    });
    try {
      verifier.pragma('foreign_keys = ON');
      verifyFullIntegrity(verifier);
    } finally {
      verifier.close();
    }
    await rm(`${temporaryPath}-wal`, { force: true });
    await rm(`${temporaryPath}-shm`, { force: true });
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    await rm(`${temporaryPath}-wal`, { force: true }).catch(() => undefined);
    await rm(`${temporaryPath}-shm`, { force: true }).catch(() => undefined);
    throw error;
  }
}
