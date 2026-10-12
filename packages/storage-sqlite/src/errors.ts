export type StorageErrorCode =
  | 'DATABASE_BUSY'
  | 'DATABASE_CORRUPT'
  | 'DATABASE_DISK_FULL'
  | 'IDEMPOTENCY_CONFLICT'
  | 'MIGRATION_CHECKSUM_MISMATCH'
  | 'NOT_FOUND'
  | 'CONFLICT_REVISION'
  | 'PARENT_PROJECT_UNAVAILABLE'
  | 'SCHEMA_INCOMPATIBLE'
  | 'UNRECOGNIZED_SCHEMA';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;

  constructor(
    code: StorageErrorCode,
    details: Readonly<Record<string, string | number | boolean | null>> = {},
  ) {
    super(code);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
  }
}
