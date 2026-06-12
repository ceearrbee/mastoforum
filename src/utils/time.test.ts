import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { relativeTime } from './time';

const NOW = new Date('2026-05-28T12:00:00Z').getTime();
const DAY = 86_400_000;

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('formats seconds', () => {
    expect(relativeTime(NOW - 30_000)).toBe('30s ago');
  });

  it('clamps sub-second deltas to 1s (never 0 or negative)', () => {
    expect(relativeTime(NOW - 200)).toBe('1s ago');
    expect(relativeTime(NOW)).toBe('1s ago');
  });

  it('rolls up to minutes, hours, and days at each boundary', () => {
    expect(relativeTime(NOW - 5 * 60_000)).toBe('5m ago');
    expect(relativeTime(NOW - 3 * 3600_000)).toBe('3h ago');
    expect(relativeTime(NOW - 4 * DAY)).toBe('4d ago');
  });

  it('accepts an ISO string as well as epoch ms', () => {
    expect(relativeTime(new Date(NOW - 2 * 60_000).toISOString())).toBe('2m ago');
  });

  it('falls back to a locale date string past 30 days', () => {
    const old = NOW - 40 * DAY;
    expect(relativeTime(old)).toBe(new Date(old).toLocaleDateString());
  });
});
