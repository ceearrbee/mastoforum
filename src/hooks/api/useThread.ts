import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { getStreamingUrl } from '../../utils/instanceConfig';
import { errorMessage } from '../../utils/apiErrors';
import { openUserStream } from '../../utils/streaming';
import type { StatusAction } from '../../components/PostCard';

export interface ThreadData {
  mainPost: mastodon.v1.Status;
  ancestors: mastodon.v1.Status[];
  descendants: mastodon.v1.Status[];
}

interface UseThreadOptions {
  /** Called when the thread's root post is deleted, so the caller can navigate away. */
  onRootDeleted: () => void;
}

/**
 * Fold a streamed status into cached thread data: an edit to a post already in
 * view replaces it in place; a new reply within the thread is appended; anything
 * else leaves the cache untouched.
 */
function mergeStreamedStatus(prev: ThreadData, status: mastodon.v1.Status): ThreadData {
  const known = new Set<string>([
    prev.mainPost.id,
    ...prev.ancestors.map((p) => p.id),
    ...prev.descendants.map((p) => p.id),
  ]);
  if (known.has(status.id)) {
    const swap = (p: mastodon.v1.Status) => (p.id === status.id ? status : p);
    return {
      mainPost: swap(prev.mainPost),
      ancestors: prev.ancestors.map(swap),
      descendants: prev.descendants.map(swap),
    };
  }
  if (status.inReplyToId && known.has(status.inReplyToId)) {
    return { ...prev, descendants: [...prev.descendants, status] };
  }
  return prev;
}

/** Apply an optimistic favourite/boost/bookmark toggle to one post in the thread. */
function applyOptimisticAction(
  prev: ThreadData,
  postId: string,
  action: StatusAction,
): ThreadData {
  const mutate = (p: mastodon.v1.Status): mastodon.v1.Status => {
    if (p.id !== postId) return p;
    switch (action) {
      case 'favourite':
        return { ...p, favourited: true, favouritesCount: p.favouritesCount + 1 };
      case 'unfavourite':
        return { ...p, favourited: false, favouritesCount: Math.max(0, p.favouritesCount - 1) };
      case 'bookmark':
        return { ...p, bookmarked: true };
      case 'unbookmark':
        return { ...p, bookmarked: false };
      case 'reblog':
        return { ...p, reblogged: true, reblogsCount: p.reblogsCount + 1 };
      case 'unreblog':
        return { ...p, reblogged: false, reblogsCount: Math.max(0, p.reblogsCount - 1) };
    }
  };
  return {
    mainPost: mutate(prev.mainPost),
    ancestors: prev.ancestors.map(mutate),
    descendants: prev.descendants.map(mutate),
  };
}

/** Subscribe to the user stream and push live replies/edits/deletes into the cache. */
function useThreadLiveUpdates(
  id: string | undefined,
  token: string | undefined,
  queryClient: QueryClient,
) {
  useEffect(() => {
    if (!id || !token) return;
    const streamingApiUrl = getStreamingUrl();
    if (!streamingApiUrl) return;

    return openUserStream(
      { streamingApiUrl, accessToken: token },
      {
        onUpdate: (status) =>
          queryClient.setQueryData<ThreadData>(['thread', id], (prev) =>
            prev ? mergeStreamedStatus(prev, status) : prev,
          ),
        onDelete: (statusId) =>
          queryClient.setQueryData<ThreadData>(['thread', id], (prev) =>
            prev
              ? { ...prev, descendants: prev.descendants.filter((p) => p.id !== statusId) }
              : prev,
          ),
      },
    );
  }, [id, token, queryClient]);
}

/**
 * Owns all data + cache concerns for a thread: the status/context query, live
 * stream updates (new replies, edits, deletes pushed straight into the cache),
 * and optimistic favourite/boost/bookmark/mute/delete mutations with rollback.
 * The component is left with only UI, keyboard, and read-state concerns.
 */
export function useThread(id: string | undefined, { onRootDeleted }: UseThreadOptions) {
  const queryClient = useQueryClient();
  const { client, credentials } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery<ThreadData>({
    queryKey: ['thread', id],
    queryFn: async () => {
      const status = await requireClient(client).v1.statuses.$select(id!).fetch();
      const context = await requireClient(client).v1.statuses.$select(id!).context.fetch();
      return {
        mainPost: status,
        ancestors: context.ancestors,
        descendants: context.descendants,
      };
    },
    enabled: !!client && !!id,
  });

  useThreadLiveUpdates(id, credentials?.token, queryClient);

  const muteMutation = useMutation({
    mutationFn: async () => {
      const threadData = queryClient.getQueryData<ThreadData>(['thread', id]);
      if (!threadData) return;
      const sel = requireClient(client).v1.statuses.$select(id!);
      return threadData.mainPost.muted ? sel.unmute() : sel.mute();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['thread', id] }),
    onError: (err: unknown) =>
      setActionError(errorMessage(err, 'Failed to toggle mute')),
  });

  const handleAction = async (postId: string, action: StatusAction) => {
    const snapshot = queryClient.getQueryData<ThreadData>(['thread', id]);
    queryClient.setQueryData<ThreadData>(['thread', id], (prev) =>
      prev ? applyOptimisticAction(prev, postId, action) : prev,
    );
    try {
      const sel = requireClient(client).v1.statuses.$select(postId);
      // masto's client is a Proxy that returns `undefined` for `call`/`apply`/`bind`
      // (they're reserved), so `fn.call(sel)` throws "fn.call is not a function".
      // The proxy's apply trap ignores `this`, so invoke the action directly.
      await (sel[action] as () => Promise<mastodon.v1.Status>)();
    } catch (err: unknown) {
      queryClient.setQueryData(['thread', id], snapshot);
      setActionError(errorMessage(err, `Failed to ${action}`));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (post: mastodon.v1.Status) => requireClient(client).v1.statuses.$select(post.id).remove(),
    onSuccess: (_, post) => {
      if (post.id === id) {
        onRootDeleted();
      } else {
        queryClient.invalidateQueries({ queryKey: ['thread', id] });
      }
    },
    onError: (err: unknown) =>
      setActionError(errorMessage(err, 'Delete failed')),
  });

  return {
    threadData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    actionError,
    setActionError,
    handleAction,
    muteMutation,
    deleteMutation,
  };
}
