import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 20;

/** The signed-in user's scheduled (not-yet-published) posts, paginated. */
export function useScheduledStatuses() {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.ScheduledStatus>({
    queryKey: ['scheduledStatuses'],
    fetchPage: async (params) => requireClient(client).v1.scheduledStatuses.list(params),
    pageSize: PAGE_SIZE,
    enabled: !!client,
  });
}
