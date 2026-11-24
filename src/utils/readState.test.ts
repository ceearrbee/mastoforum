import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstUnseenId, getThreadSeen, markSeenAfter, markThreadSeen } from './readState';

describe('readState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('markThreadSeen stores the reply-count snapshot immediately', () => {
    markThreadSeen('t1', 7);
    expect(getThreadSeen('t1')?.seenReplies).toBe(7);
  });

  it('getThreadSeen returns undefined for an unknown thread', () => {
    expect(getThreadSeen('nope')).toBeUndefined();
  });

  it('markSeenAfter does not record until the dwell elapses', () => {
    markSeenAfter('t2', 5, 3000);
    expect(getThreadSeen('t2')).toBeUndefined();

    vi.advanceTimersByTime(2999);
    expect(getThreadSeen('t2')).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(getThreadSeen('t2')?.seenReplies).toBe(5);
  });

  it('markSeenAfter returns a cancel function that prevents the write', () => {
    const cancel = markSeenAfter('t3', 9, 3000);
    cancel();
    vi.advanceTimersByTime(10_000);
    expect(getThreadSeen('t3')).toBeUndefined();
  });

  it('a later markSeenAfter overwrites an earlier snapshot once it fires', () => {
    markThreadSeen('t4', 2);
    markSeenAfter('t4', 6, 1000);
    vi.advanceTimersByTime(1000);
    expect(getThreadSeen('t4')?.seenReplies).toBe(6);
  });

  it('markThreadSeen stores the seen descendant ids alongside the reply count', () => {
    markThreadSeen('t5', 2, ['c1', 'gc1', 'c2']);
    expect(getThreadSeen('t5')).toMatchObject({ seenReplies: 2, seenIds: ['c1', 'gc1', 'c2'] });
  });

  it('markSeenAfter writes the ids once the dwell elapses', () => {
    markSeenAfter('t6', 1, 1000, ['a']);
    vi.advanceTimersByTime(1000);
    expect(getThreadSeen('t6')?.seenIds).toEqual(['a']);
  });

  it('keeps ids only for the most recently seen threads', () => {
    for (let i = 0; i < 35; i++) {
      vi.setSystemTime(1_000_000 + i);
      markThreadSeen(`old${i}`, 1, [`id${i}`]);
    }
    expect(getThreadSeen('old0')?.seenIds).toBeUndefined();
    expect(getThreadSeen('old0')?.seenReplies).toBe(1);
    expect(getThreadSeen('old34')?.seenIds).toEqual(['id34']);
  });
});

describe('firstUnseenId', () => {
  const state = (seenIds?: string[]) => ({ seenReplies: 2, seenIds, updatedAt: 0 });

  it('returns the first descendant, in list order, that was not seen', () => {
    // GC1 is a reply to C1 posted after both top-level replies were seen.
    expect(firstUnseenId(state(['C1', 'C2']), ['C1', 'GC1', 'C2'])).toBe('GC1');
  });

  it('returns undefined when every descendant was seen', () => {
    expect(firstUnseenId(state(['C1', 'GC1', 'C2']), ['C1', 'GC1', 'C2'])).toBeUndefined();
  });

  it('returns undefined without a snapshot or without recorded ids', () => {
    expect(firstUnseenId(undefined, ['C1'])).toBeUndefined();
    expect(firstUnseenId(state(undefined), ['C1'])).toBeUndefined();
  });
});
