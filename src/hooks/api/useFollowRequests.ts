import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 30;

/** Accounts awaiting the signed-in user's follow approval, paginated. */
export function useFollowRequests() {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.Account>({
    queryKey: ['followRequests'],
    fetchPage: async (params) => requireClient(client).v1.followRequests.list(params),
    pageSize: PAGE_SIZE,
    enabled: !!client,
  });
}
