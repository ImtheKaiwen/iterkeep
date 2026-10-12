import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { StorageError } from '../errors.js';

export type StorageActorKind = 'user' | 'agent' | 'import' | 'system';

export interface ReceiptIdentity {
  readonly actorKind: StorageActorKind;
  readonly actorRef: string;
  readonly commandName: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
}

interface ReceiptRow {
  readonly payload_sha256: string;
  readonly result_json: string;
}

export type ReceiptLookupResult =
  | { readonly state: 'not_found' }
  | {
      readonly state: 'committed';
      readonly payloadHash: string;
      readonly result: unknown;
    };

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function hashCommandPayload(
  commandName: string,
  payload: unknown,
): string {
  const canonical = JSON.stringify({
    commandName,
    payload: canonicalize(payload),
    schemaVersion: 1,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function lookupReceipt<T>(
  db: Database.Database,
  identity: ReceiptIdentity,
  validate: (value: unknown) => T,
): T | null {
  const row = db
    .prepare<[string, string, string, string], ReceiptRow>(
      `SELECT payload_sha256,result_json FROM idempotency_receipts
       WHERE actor_kind=? AND actor_ref=?
         AND command_name=? AND idempotency_key=?`,
    )
    .get(
      identity.actorKind,
      identity.actorRef,
      identity.commandName,
      identity.idempotencyKey,
    );
  if (!row) return null;
  if (row.payload_sha256 !== identity.payloadHash) {
    throw new StorageError('IDEMPOTENCY_CONFLICT');
  }
  return validate(JSON.parse(row.result_json) as unknown);
}

export function lookupReceiptStatus(
  db: Database.Database,
  identity: Omit<ReceiptIdentity, 'payloadHash'>,
): ReceiptLookupResult {
  const row = db
    .prepare<[string, string, string, string], ReceiptRow>(
      `SELECT payload_sha256,result_json FROM idempotency_receipts
       WHERE actor_kind=? AND actor_ref=?
         AND command_name=? AND idempotency_key=?`,
    )
    .get(
      identity.actorKind,
      identity.actorRef,
      identity.commandName,
      identity.idempotencyKey,
    );
  if (!row) return { state: 'not_found' };
  return {
    state: 'committed',
    payloadHash: row.payload_sha256,
    result: JSON.parse(row.result_json) as unknown,
  };
}

export function recordReceipt(
  db: Database.Database,
  input: ReceiptIdentity & {
    readonly receiptId: string;
    readonly result: unknown;
    readonly now: string;
    readonly expiresAt: string;
  },
): void {
  db.prepare(
    `INSERT INTO idempotency_receipts
     (id,actor_kind,actor_ref,command_name,idempotency_key,
      payload_sha256,result_json,created_at,expires_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    input.receiptId,
    input.actorKind,
    input.actorRef,
    input.commandName,
    input.idempotencyKey,
    input.payloadHash,
    JSON.stringify(input.result),
    input.now,
    input.expiresAt,
  );
}
