import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { useFlatPages } from './useFlatPages';

interface OffsetListOptions<T> {
  queryKey: QueryKey;
  /** Fetch one page; receives `{ limit, offset }`. */
  fetchPage: (params: { limit: number; offset: number }) => Promise<T[]>;
  pageSize: number;
  enabled?: boolean;
}

/**
 * Generic offset-based infinite list, for endpoints that page by `offset`
 * rather than a cursor (e.g. `v2.search`). Stops once a page comes back short.
 */
export function useOffsetList<T>({
  queryKey,
  fetchPage,
  pageSize,
  enabled = true,
}: OffsetListOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPage({ limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage: T[], allPages: T[][]) =>
      lastPage.length < pageSize ? undefined : allPages.length * pageSize,
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
