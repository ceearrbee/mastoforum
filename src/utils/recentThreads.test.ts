import { beforeEach, describe, expect, it } from 'vitest';
import type { mastodon } from 'masto';
import {
  clearRecentThreads,
  getRecentThreads,
  recordRecentThread,
} from './recentThreads';

function statusFixture(overrides: Partial<mastodon.v1.Status> = {}): mastodon.v1.Status {
  return {
    id: 's1',
    content: '<p>Hello world</p>',
    spoilerText: '',
    createdAt: '2026-05-01T12:00:00Z',
    repliesCount: 3,
    tags: [{ name: 'fediverse', url: '' }],
    account: {
      acct: 'ada',
      displayName: 'Ada Lovelace',
      username: 'ada',
      avatar: 'https://example.com/a.png',
    },
    ...overrides,
  } as unknown as mastodon.v1.Status;
}

describe('recentThreads', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a status with rich fields', () => {
    recordRecentThread(statusFixture());
    const [entry] = getRecentThreads();
    expect(entry.id).toBe('s1');
    expect(entry.title).toBe('Hello world');
    expect(entry.repliesCount).toBe(3);
    expect(entry.primaryTag).toBe('fediverse');
    expect(entry.account?.displayName).toBe('Ada Lovelace');
    expect(entry.viewedAt).toBeGreaterThan(0);
  });

  it('uses spoilerText as title when present', () => {
    recordRecentThread(statusFixture({ spoilerText: 'Chapter 2' }));
    expect(getRecentThreads()[0].title).toBe('Chapter 2');
  });

  it('moves an existing thread to the top instead of duplicating', () => {
    recordRecentThread(statusFixture({ id: 'a' }));
    recordRecentThread(statusFixture({ id: 'b' }));
    recordRecentThread(statusFixture({ id: 'a' }));
    const ids = getRecentThreads().map((t) => t.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('caps the list at RECENT_THREADS_LIMIT', () => {
    for (let i = 0; i < 20; i++) recordRecentThread(statusFixture({ id: `id-${i}` }));
    expect(getRecentThreads().length).toBeLessThanOrEqual(15);
  });

  it('migrates legacy {id, title, timestamp} entries', () => {
    localStorage.setItem(
      'recent_threads',
      JSON.stringify([{ id: 'legacy', title: 'old', timestamp: 1717_000_000_000 }]),
    );
    const [entry] = getRecentThreads();
    expect(entry.id).toBe('legacy');
    expect(entry.title).toBe('old');
    expect(entry.viewedAt).toBe(1717_000_000_000);
    expect(entry.account).toBeUndefined();
  });

  it('ignores malformed entries', () => {
    localStorage.setItem('recent_threads', JSON.stringify(['not-an-object', { id: 42 }, null]));
    expect(getRecentThreads()).toEqual([]);
  });

  it('returns an empty array when localStorage has nothing', () => {
    expect(getRecentThreads()).toEqual([]);
  });

  it('handles unparseable JSON gracefully', () => {
    localStorage.setItem('recent_threads', '{not json');
    expect(getRecentThreads()).toEqual([]);
  });

  it('clearRecentThreads wipes the list', () => {
    recordRecentThread(statusFixture());
    expect(getRecentThreads()).toHaveLength(1);
    clearRecentThreads();
    expect(getRecentThreads()).toEqual([]);
  });

  it('clears via empty title fallback when content is empty too', () => {
    recordRecentThread(statusFixture({ content: '', spoilerText: '' }));
    expect(getRecentThreads()[0].title).toBe('Untitled');
  });
});
