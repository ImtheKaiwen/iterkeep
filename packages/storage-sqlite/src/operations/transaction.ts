import type Database from 'better-sqlite3';

export function inImmediateTransaction<T>(
  db: Database.Database,
  operation: () => T,
): T {
  return db.transaction(operation).immediate();
}
