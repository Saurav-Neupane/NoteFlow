import { describe, it, expect } from 'vitest';
import { countWords, countCharacters, readingTimeMinutes, truncate, isValidEmail, slugify } from '@/utils/text';
import { formatBytes, formatProgress } from '@/utils/format';

describe('text utils', () => {
  it('counts words and characters', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  ')).toBe(0);
    expect(countCharacters('abc')).toBe(3);
  });

  it('computes reading time', () => {
    expect(readingTimeMinutes(0)).toBe(1);
    expect(readingTimeMinutes(400)).toBe(2);
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde…');
    expect(truncate('short', 50)).toBe('short');
  });

  it('validates emails and slugs', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(slugify('Hello World!')).toBe('hello-world');
  });
});

describe('format utils', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats progress clamping to 0 for empty lists', () => {
    expect(formatProgress(0, 0)).toBe(0);
    expect(formatProgress(1, 4)).toBe(25);
  });
});