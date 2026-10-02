import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { BOARD_PAGE_SIZE } from '../../config';
import { cursorNextParam, listParams } from './cursor';
import { useFlatPages } from './useFlatPages';

export interface BoardFilterOptions {
  /** Additional tags that must all be present on the status (AND). */
  all?: string[];
  /** Additional tags where any can be present on the status (OR). */
  any?: string[];
  /** Tags that must not be present on the status (NOT). */
  none?: string[];
}

/**
 * Top-level posts for a tag board, paginated. Replies are filtered out so the
 * board lists only topics (the thread roots).
 *
 * Supports compound/filtered queries via Mastodon's `all[]`, `any[]`, and `none[]` params.
 */
export function useBoardTimeline(decodedTag: string, options?: BoardFilterOptions) {
  const { client } = useAuth();
  const allKey = options?.all?.slice().sort().join(',') ?? '';
  const anyKey = options?.any?.slice().sort().join(',') ?? '';
  const noneKey = options?.none?.slice().sort().join(',') ?? '';

  const query = useInfiniteQuery({
    queryKey: ['board', decodedTag, allKey, anyKey, noneKey],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const extraParams: Record<string, unknown> = {};
      if (options?.all && options.all.length > 0) extraParams.all = options.all;
      if (options?.any && options.any.length > 0) extraParams.any = options.any;
      if (options?.none && options.none.length > 0) extraParams.none = options.none;

      const response = await requireClient(client).v1.timelines.tag
        .$select(decodedTag)
        .list({ ...listParams(pageParam, BOARD_PAGE_SIZE), ...extraParams });
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
