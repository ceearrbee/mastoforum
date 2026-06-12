import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

const TRENDS_STALE_TIME = 5 * 60_000;

/**
 * Instance discovery trends — tags, posts and links — as three independent
 * queries so a consumer can show whichever the instance exposes and surface a
 * partial error without losing the rest. Shared so the home panel (and any
 * future discovery surface) reuses one cache entry per trend kind.
 */
export function useTrends() {
  const { client } = useAuth();
  const enabled = !!client;

  const tags = useQuery<mastodon.v1.Tag[]>({
    queryKey: ['trends', 'tags'],
    queryFn: async () => await requireClient(client).v1.trends.tags.list({ limit: 8 }),
    enabled,
    staleTime: TRENDS_STALE_TIME,
  });

  const statuses = useQuery<mastodon.v1.Status[]>({
    queryKey: ['trends', 'statuses'],
    queryFn: async () => await requireClient(client).v1.trends.statuses.list({ limit: 5 }),
    enabled,
    staleTime: TRENDS_STALE_TIME,
  });

  const links = useQuery<mastodon.v1.TrendLink[]>({
    queryKey: ['trends', 'links'],
    queryFn: async () => await requireClient(client).v1.trends.links.list({ limit: 5 }),
    enabled,
    staleTime: TRENDS_STALE_TIME,
  });

  return { tags, statuses, links };
}
