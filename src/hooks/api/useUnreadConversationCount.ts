import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';

/** Count of unread direct-message conversations, for the header messages badge. */
export function useUnreadConversationCount() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['conversationUnreadCount'],
    queryFn: async () => {
      const items = await requireClient(client).v1.conversations.list({ limit: 30 });
      return items.filter((c: mastodon.v1.Conversation) => c.unread).length;
    },
    enabled: !!client,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
