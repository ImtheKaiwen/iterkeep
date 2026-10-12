import type Database from 'better-sqlite3';
import type { StorageActorKind } from './idempotency.repository.js';

export interface AppendEventInput {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateRevision: number;
  readonly occurredAt: string;
  readonly actorKind: StorageActorKind;
  readonly actorRef: string;
  readonly correlationId: string;
  readonly causationId?: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface StoredEvent {
  readonly sequence: number;
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateRevision: number;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

interface EventRow {
  readonly sequence: number;
  readonly id: string;
  readonly type: string;
  readonly aggregate_id: string;
  readonly aggregate_revision: number;
  readonly occurred_at: string;
  readonly payload_json: string;
}

export function appendEvent(
  db: Database.Database,
  input: AppendEventInput,
): void {
  db.prepare(
    `INSERT INTO domain_events
     (id,type,schema_version,aggregate_id,aggregate_revision,occurred_at,
      actor_kind,actor_ref,correlation_id,causation_id,payload_json)
     VALUES (?,?,1,?,?,?,?,?,?,?,?)`,
  ).run(
    input.id,
    input.type,
    input.aggregateId,
    input.aggregateRevision,
    input.occurredAt,
    input.actorKind,
    input.actorRef,
    input.correlationId,
    input.causationId ?? null,
    JSON.stringify(input.payload),
  );
}

export function eventsSince(
  db: Database.Database,
  sequence: number,
  limit = 100,
): readonly StoredEvent[] {
  const boundedLimit = Math.max(1, Math.min(100, limit));
  return db
    .prepare<[number, number], EventRow>(
      `SELECT sequence,id,type,aggregate_id,aggregate_revision,
              occurred_at,payload_json
       FROM domain_events WHERE sequence>? ORDER BY sequence ASC LIMIT ?`,
    )
    .all(sequence, boundedLimit)
    .map((row) => ({
      sequence: row.sequence,
      id: row.id,
      type: row.type,
      aggregateId: row.aggregate_id,
      aggregateRevision: row.aggregate_revision,
      occurredAt: row.occurred_at,
      payload: JSON.parse(row.payload_json) as Readonly<
        Record<string, unknown>
      >,
    }));
}
