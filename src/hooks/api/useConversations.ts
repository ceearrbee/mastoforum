import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { useCursorList } from './useCursorList';

const PAGE_SIZE = 30;

/** The signed-in user's direct-message conversations, paginated. */
export function useConversations() {
  const { client } = useAuth();
  return useCursorList<mastodon.v1.Conversation>({
    queryKey: ['conversations'],
    fetchPage: async (params) => requireClient(client).v1.conversations.list(params),
    pageSize: PAGE_SIZE,
    enabled: !!client,
  });
}
