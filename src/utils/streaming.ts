import { createStreamingAPIClient, type mastodon } from 'masto';

export interface ThreadStreamHandlers {
  /** A new or edited status arrived on the user's stream. */
  onUpdate?: (status: mastodon.v1.Status) => void;
  /** A status was deleted (payload is the status id). */
  onDelete?: (statusId: string) => void;
}

export interface ThreadStreamOptions {
  streamingApiUrl: string;
  accessToken: string;
}

/**
 * Open the authenticated `user` stream and forward status updates/deletes to
 * the given handlers. Mastodon has no per-thread stream, so callers filter the
 * incoming statuses (e.g. by `inReplyToId`) themselves. Returns a cleanup
 * function; degrades to a no-op when streaming is unavailable or the socket
 * can't be created (some Pleroma/Akkoma instances drop it).
 */
export function openUserStream(
  { streamingApiUrl, accessToken }: ThreadStreamOptions,
  handlers: ThreadStreamHandlers,
): () => void {
  let closed = false;
  let client: mastodon.streaming.Client | null = null;
  let subscription: mastodon.streaming.Subscription | null = null;

  try {
    client = createStreamingAPIClient({ streamingApiUrl, accessToken });
    subscription = client.user.subscribe();
  } catch {
    // The stream never opened, so hand back a no-op unsubscribe; callers can
    // then clean up unconditionally.
    return () => {
      /* nothing to tear down */
    };
  }

  void (async () => {
    try {
      for await (const event of subscription) {
        if (closed) break;
        if (event.event === 'update' || event.event === 'status.update') {
          handlers.onUpdate?.(event.payload);
        } else if (event.event === 'delete') {
          handlers.onDelete?.(event.payload);
        }
      }
    } catch {
      // Socket dropped — nothing to do; the cleanup below still runs.
    }
  })();

  return () => {
    closed = true;
    try {
      subscription?.unsubscribe();
      client?.close();
    } catch {
      // Already closed.
    }
  };
}
