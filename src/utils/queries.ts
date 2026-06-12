import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from './client';

/**
 * The signed-in user's own account. Shared so Header, Thread, and
 * AccountActionMenu use one query (one cache entry, one fetch) instead of
 * re-declaring it. Keyed by instance URL so it resets on account switch.
 */
export function useCurrentUser() {
  const { client, credentials } = useAuth();
  return useQuery<mastodon.v1.AccountCredentials>({
    queryKey: ['verifyCredentials', credentials?.url],
    queryFn: () => requireClient(client).v1.accounts.verifyCredentials(),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });
}

/** The tags the signed-in user follows. Shared by Home and the left rail. */
export function useFollowedTags() {
  const { client } = useAuth();
  return useQuery<mastodon.v1.Tag[]>({
    queryKey: ['followedTags'],
    queryFn: async () => await requireClient(client).v1.followedTags.list(),
    enabled: !!client,
  });
}
