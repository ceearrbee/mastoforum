import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/**
 * The editable source (markdown text + spoiler) of one of the user's own
 * statuses. `Status.text` is null on normal reads, so the edit form fetches
 * this. `version` keys the cache so an edited post refetches.
 */
export function useStatusSource(id: string | null, version: string, enabled: boolean) {
  const { client } = useAuth();
  return useQuery<mastodon.v1.StatusSource>({
    queryKey: ['statusSource', id, version],
    queryFn: () => requireClient(client).v1.statuses.$select(id as string).source.fetch(),
    enabled: enabled && !!client && id !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
