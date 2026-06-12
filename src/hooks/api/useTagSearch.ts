import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

const SUGGESTION_LIMIT = 6;

/**
 * Hashtag suggestions for a partial `#tag` query, for the header's live search
 * combobox. Pass an already-debounced query (see `useDebounce`); the empty
 * string disables the query so no request fires when there's nothing to match.
 * Results are cached per query, so re-typing a recent prefix is instant.
 */
export function useTagSearch(query: string) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['tagSearch', query],
    queryFn: async () => {
      const res = await requireClient(client).v2.search.list({
        q: query,
        type: 'hashtags',
        limit: SUGGESTION_LIMIT,
        resolve: false,
      });
      return res.hashtags;
    },
    enabled: !!client && query.length > 0,
    staleTime: 30_000,
  });
}
