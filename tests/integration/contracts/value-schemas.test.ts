import {
  LocalDateSchema,
  MarkdownSchema,
  ProjectNameSchema,
  ShortTextSchema,
  TaskTitleSchema,
  UtcMsSchema,
  UuidV4Schema,
} from '@iterkeep/contracts';
import { describe, expect, it } from 'vitest';

describe('IP-03 canonical value schemas', () => {
  it('accepts canonical identity and calendar values', () => {
    expect(
      UuidV4Schema.parse('793c4898-9298-4057-9e1d-95d22e457d21'),
    ).toBeTruthy();
    expect(UtcMsSchema.parse('2026-10-10T14:15:00.000Z')).toBeTruthy();
    expect(LocalDateSchema.parse('2024-02-29')).toBeTruthy();
  });

  it.each([
    ['uppercase UUID', UuidV4Schema, '793C4898-9298-4057-9E1D-95D22E457D21'],
    ['non-v4 UUID', UuidV4Schema, '793c4898-9298-3057-9e1d-95d22e457d21'],
    ['UTC without milliseconds', UtcMsSchema, '2026-10-10T14:15:00Z'],
    ['impossible UTC date', UtcMsSchema, '2026-02-30T14:15:00.000Z'],
    ['impossible local date', LocalDateSchema, '2025-02-29'],
  ])('rejects %s', (_name, schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });

  it('normalizes bounded human text without counting UTF-16 units', () => {
    expect(ProjectNameSchema.parse('  I\u0307terkeep  ')).toBe('İterkeep');
    expect(TaskTitleSchema.safeParse('line one\nline two').success).toBe(false);
    expect(ProjectNameSchema.safeParse('😀'.repeat(120)).success).toBe(true);
    expect(ProjectNameSchema.safeParse('😀'.repeat(121)).success).toBe(false);
    expect(ShortTextSchema.parse('a\r\nb')).toBe('a\nb');
  });

  it('enforces UTF-8 byte limits for short text and Markdown', () => {
    expect(ShortTextSchema.safeParse('ş'.repeat(1_001)).success).toBe(false);
    expect(
      MarkdownSchema.safeParse('a'.repeat(2 * 1024 * 1024 + 1)).success,
    ).toBe(false);
  });
});
