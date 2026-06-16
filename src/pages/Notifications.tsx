import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useNotificationsList } from '../hooks/api';
import AvatarChip from '../components/AvatarChip';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import { displayNameOf, previewText, NOTIFICATION_PREVIEW_CHARS } from '../utils/status';
import { relativeTime } from '../utils/time';
import styles from './Notifications.module.css';

function verbFor(type: mastodon.v1.NotificationType): string {
  switch (type) {
    case 'mention':
      return 'mentioned you';
    case 'reblog':
      return 'boosted your post';
    case 'favourite':
      return 'liked your post';
    case 'follow':
      return 'followed you';
    case 'follow_request':
      return 'requested to follow you';
    case 'poll':
      return 'poll you voted in ended';
    case 'status':
      return 'posted';
    case 'update':
      return 'edited their post';
    case 'admin.sign_up':
      return 'signed up';
    case 'admin.report':
      return 'reported a user';
    default:
      return type;
  }
}

export default function Notifications() {
  const { client, credentials } = useAuth();
  const queryClient = useQueryClient();

  const {
    items,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationsList();

  const { mutate: markRead } = useMutation({
    mutationFn: async (lastReadId: string) =>
      requireClient(client).v1.markers.create({ notifications: { lastReadId } }),
  });

  const latestId = items.length > 0 ? items[0].id : null;

  useEffect(() => {
    if (latestId) markRead(latestId);
  }, [latestId, markRead]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['notificationMarker'] });
  }, [items, queryClient]);

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Notifications</PageHeading>
        <p className={styles.empty}>Sign in to see notifications.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Notifications</PageHeading>
      <PaginatedList
        items={items}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load notifications"
        emptyMessage="No notifications yet."
        emptyClassName={styles.empty}
        skeletonRows={6}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
      <ul className={styles.list}>
        {items.map((n) => (
          <li key={n.id} className={styles.item}>
            <Link
              to={
                n.status
                  ? `/thread/${encodeURIComponent(n.status.id)}`
                  : `/@${encodeURIComponent(n.account.acct)}`
              }
              className={styles.link}
            >
              <AvatarChip account={n.account} size="md" />
              <div className={styles.body}>
                <p className={styles.label}>
                  <strong>{displayNameOf(n.account)}</strong>{' '}
                  <span className={styles.verb}>{verbFor(n.type)}</span>
                  <span className={styles.time}> · {relativeTime(n.createdAt)}</span>
                </p>
                {n.status && (
                  <p className={styles.preview}>
                    {previewText(n.status, NOTIFICATION_PREVIEW_CHARS)}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      </PaginatedList>
    </div>
  );
}
