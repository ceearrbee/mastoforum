import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 20;

/** Posts in a user-defined list timeline, paginated. */
export function useListTimeline(id: string | undefined) {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.Status>({
    queryKey: ['listTimeline', id],
    fetchPage: async (params) => requireClient(client).v1.timelines.list.$select(id!).list(params),
    pageSize: PAGE_SIZE,
    enabled: !!client && !!id,
  });
}
