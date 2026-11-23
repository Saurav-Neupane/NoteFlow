import { describe, expect, it } from 'vitest';
import { localDateTimeToUtc } from './time';

describe('localDateTimeToUtc', () => {
  it('interprets wall time in the selected IANA timezone', () => {
    expect(localDateTimeToUtc('2026-11-23T12:00', 'Asia/Kathmandu').toISOString()).toBe('2026-11-23T06:15:00.000Z');
    expect(localDateTimeToUtc('2026-11-23T12:00', 'America/New_York').toISOString()).toBe('2026-11-23T17:00:00.000Z');
  });

  it('rejects invalid and nonexistent local times', () => {
    expect(() => localDateTimeToUtc('bad', 'UTC')).toThrow();
    expect(() => localDateTimeToUtc('2026-03-08T02:30', 'America/New_York')).toThrow();
  });
});
