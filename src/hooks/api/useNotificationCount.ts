import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/**
 * Count of notifications newer than the user's last-read marker, for the header
 * badge. Polls in the background; shared so any header/badge consumer reads one
 * cache entry instead of re-declaring the query.
 */
export function useNotificationCount() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['notificationCount'],
    queryFn: async () => {
      const c = requireClient(client);
      const items = await c.v1.notifications.list({ limit: 30 });
      const markers = await c.v1.markers
        .fetch({ timeline: ['notifications'] })
        .catch(() => null);
      const lastRead = markers?.notifications?.lastReadId;
      if (!lastRead) return items.length;
      return items.filter((n: mastodon.v1.Notification) => n.id > lastRead).length;
    },
    enabled: !!client,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
