export const DOMAIN_ERROR_CODES = [
  'VALIDATION_FAILED',
  'PAYLOAD_TOO_LARGE',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'CONFLICT_REVISION',
  'INVALID_STATUS_TRANSITION',
  'INBOX_PROTECTED',
  'INBOX_ALREADY_EXISTS',
  'REFERENTIAL_INTEGRITY',
  'LINK_CYCLE',
  'DECISION_HISTORY_PROTECTED',
  'APPROVAL_REQUIRED',
  'APPROVAL_EXPIRED',
  'PERMISSION_DENIED',
  'INVALID_IDEMPOTENCY_KEY',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
export interface DomainFailure {
  readonly code: DomainErrorCode;
  readonly safeMessageKey: string;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
}
export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DomainFailure };
