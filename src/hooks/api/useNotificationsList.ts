import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 40;

/** The signed-in user's notifications, paginated. */
export function useNotificationsList() {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.Notification>({
    queryKey: ['notifications'],
    fetchPage: async (params) => requireClient(client).v1.notifications.list(params),
    pageSize: PAGE_SIZE,
    enabled: !!client,
  });
}
