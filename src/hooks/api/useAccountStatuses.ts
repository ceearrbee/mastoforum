import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 20;

/** An account's top-level posts (no replies/reblogs), paginated — for Profile. */
export function useAccountStatuses(accountId: string | undefined) {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.Status>({
    queryKey: ['accountStatuses', accountId],
    fetchPage: async (params) =>
      requireClient(client).v1.accounts.$select(accountId!).statuses.list({
        ...params,
        excludeReplies: true,
        excludeReblogs: true,
      }),
    pageSize: PAGE_SIZE,
    enabled: !!client && !!accountId,
  });
}
