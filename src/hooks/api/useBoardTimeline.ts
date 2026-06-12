import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { BOARD_PAGE_SIZE } from '../../config';
import { cursorNextParam, listParams } from './cursor';
import { useFlatPages } from './useFlatPages';

/**
 * Top-level posts for a tag board, paginated. Replies are filtered out so the
 * board lists only topics (the thread roots).
 */
export function useBoardTimeline(decodedTag: string) {
  const { client } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['board', decodedTag],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await requireClient(client).v1.timelines.tag
        .$select(decodedTag)
        .list(listParams(pageParam, BOARD_PAGE_SIZE));
      return response.filter((post) => post.inReplyToId === null);
    },
    getNextPageParam: cursorNextParam,
    enabled: !!client && !!decodedTag,
  });

  return {
    items: useFlatPages(query.data),
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
