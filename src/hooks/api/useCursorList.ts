import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { cursorNextParam, listParams } from './cursor';
import { useFlatPages } from './useFlatPages';

interface CursorListOptions<T> {
  queryKey: QueryKey;
  /** Fetch one page; receives `{ limit, maxId? }` from `listParams`. */
  fetchPage: (params: { limit: number; maxId?: string }) => Promise<T[]>;
  pageSize: number;
  enabled?: boolean;
}

/**
 * Generic cursor (maxId) infinite list. Wraps `useInfiniteQuery` with the shared
 * `cursor.ts` helpers and a flattened `items` array so pages only declare the
 * endpoint call. Style reference: `useBoardTimeline` / `useBookmarks`.
 */
export function useCursorList<T extends { id: string }>({
  queryKey,
  fetchPage,
  pageSize,
  enabled = true,
}: CursorListOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchPage(listParams(pageParam, pageSize)),
    getNextPageParam: cursorNextParam,
    enabled,
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
