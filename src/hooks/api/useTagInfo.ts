import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/** Metadata for a tag (including the signed-in user's follow state). */
export function useTagInfo(decodedTag: string) {
  const { client } = useAuth();
  return useQuery<mastodon.v1.Tag>({
    queryKey: ['tagInfo', decodedTag],
    queryFn: () => requireClient(client).v1.tags.$select(decodedTag).fetch(),
    enabled: !!client && !!decodedTag,
    staleTime: 5 * 60_000,
  });
}
