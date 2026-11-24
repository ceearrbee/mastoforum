import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/**
 * The signed-in user's lists. Shared by the left rail and the manager modal so
 * both read one `['lists']` cache entry. `enabled` lets the modal defer the
 * fetch until it is opened.
 */
export function useLists({ enabled = true }: { enabled?: boolean } = {}) {
  const { client } = useAuth();
  return useQuery<mastodon.v1.List[]>({
    queryKey: ['lists'],
    queryFn: async () => await requireClient(client).v1.lists.list(),
    enabled: !!client && enabled,
  });
}
