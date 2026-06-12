import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getThreadSeen, markSeenAfter, markThreadSeen } from './readState';

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
});
