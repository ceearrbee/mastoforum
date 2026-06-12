import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@carbon/react';
import { TrashCan } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useScheduledStatuses } from '../hooks/api';
import ConfirmModal from '../components/ConfirmModal';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import { errorMessage } from '../utils/apiErrors';
import { truncate } from '../utils/sanitize';
import { pushToast } from '../utils/toast';
import styles from './Scheduled.module.css';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Scheduled() {
  const { client, credentials } = useAuth();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const {
    items,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useScheduledStatuses();

  const cancel = useMutation({
    mutationFn: (id: string) => requireClient(client).v1.scheduledStatuses.$select(id).remove(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduledStatuses'] }),
    onError: (err) =>
      pushToast({
        kind: 'error',
        title: 'Failed to cancel scheduled post',
        subtitle: errorMessage(err),
      }),
  });

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Scheduled posts</PageHeading>
        <p className={styles.empty}>Sign in to see your scheduled posts.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Scheduled posts</PageHeading>

      <PaginatedList
        items={items}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load scheduled posts"
        emptyMessage="Nothing scheduled. New posts you schedule will appear here."
        emptyClassName={styles.empty}
        skeletonRows={4}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.body}>
              <p className={styles.when}>{formatWhen(item.scheduledAt)}</p>
              <p className={styles.preview}>
                {item.params.text ? truncate(item.params.text, 200) : '(no text)'}
              </p>
              {item.mediaAttachments.length > 0 && (
                <p className={styles.meta}>
                  {item.mediaAttachments.length} attachment
                  {item.mediaAttachments.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <Button
              kind="danger--ghost"
              size="sm"
              renderIcon={TrashCan}
              disabled={cancel.isPending}
              onClick={() => setPendingId(item.id)}
            >
              Cancel
            </Button>
          </li>
        ))}
      </ul>
      </PaginatedList>

      <ConfirmModal
        open={pendingId !== null}
        heading="Cancel scheduled post"
        primaryText="Cancel post"
        danger
        onConfirm={() => {
          if (pendingId) cancel.mutate(pendingId);
        }}
        onClose={() => setPendingId(null)}
      >
        This scheduled post will be deleted and won&rsquo;t be published.
      </ConfirmModal>
    </div>
  );
}
