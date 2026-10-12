export type ApplicationErrorCode =
  | 'CONFLICT_REVISION'
  | 'DECISION_HISTORY_PROTECTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INBOX_PROTECTED'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'INVALID_STATUS_TRANSITION'
  | 'NOT_FOUND'
  | 'REFERENTIAL_INTEGRITY'
  | 'VALIDATION_FAILED';

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    readonly details: Readonly<
      Record<string, string | number | boolean | null>
    > = {},
  ) {
    super(code);
    this.name = 'ApplicationError';
  }
}
