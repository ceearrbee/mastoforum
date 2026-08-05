import { describe, expect, it } from 'vitest';
import type { mastodon } from 'masto';
import { sortPosts } from './sortPosts';

const post = (id: string, createdAt: string, repliesCount: number) =>
  ({ id, createdAt, repliesCount }) as unknown as mastodon.v1.Status;

const posts = [
  post('a', '2024-01-02T00:00:00Z', 1),
  post('b', '2024-01-03T00:00:00Z', 5),
  post('c', '2024-01-01T00:00:00Z', 3),
];

describe('sortPosts', () => {
  it('orders newest by createdAt descending', () => {
    expect(sortPosts(posts, 'newest').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('orders replies by repliesCount descending', () => {
    expect(sortPosts(posts, 'replies').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('preserves input order for activity', () => {
    expect(sortPosts(posts, 'activity').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    sortPosts(posts, 'newest');
    expect(posts.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
