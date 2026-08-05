import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { FEED_PAGE_SIZE } from '../../config';
import { listParams } from './cursor';

export type FeedSource = 'home' | 'local' | 'federated';

/**
 * Top-level posts from the home / local / federated timeline, paginated.
 * Replies are filtered out so the feed lists only topics.
 *
 * Pagination cursors off the last *raw* status, not the filtered list: on the
 * federated timeline most statuses are replies, so a full page can filter down
 * to zero topics and a filtered-list cursor would stop paging while plenty of
 * topics remain.
 */
export function useFeedTimeline(source: FeedSource) {
  const { client } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['feed', source],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const timelines = requireClient(client).v1.timelines;
      const params = listParams(pageParam, FEED_PAGE_SIZE);
      const raw =
        source === 'home'
          ? await timelines.home.list(params)
          : await timelines.public.list({
              ...params,
              ...(source === 'local' ? { local: true } : {}),
            });
      return {
        topics: raw.filter((post) => post.inReplyToId === null),
        lastId: raw.at(-1)?.id,
      };
    },
    getNextPageParam: (page) => page.lastId,
    enabled: !!client,
  });

  const pages = query.data?.pages;
  const items = useMemo(() => pages?.flatMap((p) => p.topics) ?? [], [pages]);

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
