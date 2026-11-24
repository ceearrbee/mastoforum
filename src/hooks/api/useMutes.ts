import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { linkNextMaxId, listParams } from './cursor';

const PAGE_SIZE = 40;

/** A muted account; `muteExpiresAt` is set only for timed mutes. */
export type MutedAccount = mastodon.v1.Account & { muteExpiresAt?: string | null };

/**
 * Accounts the signed-in user has muted, paginated. Pages by the `Link` header's
 * max_id because `/mutes` cursors on mute-record ids, not account ids.
 */
export function useMutes() {
  const { client } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['mutes'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await requireClient(client).v1.mutes.list.$raw(listParams(pageParam, PAGE_SIZE));
      return {
        accounts: res.data as MutedAccount[],
        nextMaxId: linkNextMaxId(res.headers.get('link')),
      };
    },
    getNextPageParam: (page) => page.nextMaxId,
    enabled: !!client,
  });

  const pages = query.data?.pages;
  const items = useMemo(() => pages?.flatMap((p) => p.accounts) ?? [], [pages]);

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
