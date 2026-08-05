import type { mastodon } from 'masto';

export type SortKey = 'activity' | 'newest' | 'replies';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'activity', label: 'Latest activity' },
  { key: 'newest', label: 'Newest' },
  { key: 'replies', label: 'Most replies' },
];

export function sortPosts(
  posts: mastodon.v1.Status[],
  key: SortKey,
): mastodon.v1.Status[] {
  const copy = posts.slice();
  switch (key) {
    case 'newest':
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'replies':
      return copy.sort((a, b) => b.repliesCount - a.repliesCount);
    case 'activity':
      return copy;
  }
}
