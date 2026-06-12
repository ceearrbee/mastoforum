import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/** Number of pending follow requests, for the account-menu badge. */
export function useFollowRequestCount() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['followRequestCount'],
    queryFn: async () => {
      const items = await requireClient(client).v1.followRequests.list({ limit: 40 });
      return items.length;
    },
    enabled: !!client,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
