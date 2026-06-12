import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { cursorNextParam, listParams } from './cursor';
import { useFlatPages } from './useFlatPages';

const PAGE_SIZE = 20;

/** The signed-in user's favourited posts, paginated. */
export function useFavourites() {
  const { client } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['favourites'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      await requireClient(client).v1.favourites.list(listParams(pageParam, PAGE_SIZE)),
    getNextPageParam: cursorNextParam,
    enabled: !!client,
  });

  return {
    items: useFlatPages(query.data),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
