import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@carbon/react';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useFollowRequests } from '../hooks/api';
import AvatarChip from '../components/AvatarChip';
import EmojiText from '../components/EmojiText';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import { errorMessage } from '../utils/apiErrors';
import { displayNameOf } from '../utils/status';
import { pushToast } from '../utils/toast';
import styles from './FollowRequests.module.css';

export default function FollowRequests() {
  const { client, credentials } = useAuth();
  const queryClient = useQueryClient();

  const {
    items: requests,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFollowRequests();

  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'authorize' | 'reject' }) =>
      action === 'authorize'
        ? requireClient(client).v1.followRequests.$select(id).authorize()
        : requireClient(client).v1.followRequests.$select(id).reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followRequests'] });
      queryClient.invalidateQueries({ queryKey: ['followRequestCount'] });
    },
    onError: (err, { action }) =>
      pushToast({
        kind: 'error',
        title: action === 'authorize' ? 'Failed to approve request' : 'Failed to deny request',
        subtitle: errorMessage(err),
      }),
  });

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Follow requests</PageHeading>
        <p className={styles.empty}>Sign in to manage follow requests.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Follow requests</PageHeading>

      <PaginatedList
        items={requests}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load follow requests"
        emptyMessage="No pending follow requests."
        emptyClassName={styles.empty}
        skeletonRows={4}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
      <ul className={styles.list}>
        {requests.map((account) => (
          <li key={account.id} className={styles.item}>
            <Link to={`/@${encodeURIComponent(account.acct)}`} className={styles.who}>
              <AvatarChip account={account} size="md" />
              <span className={styles.names}>
                <span className={styles.displayName}>
                  <EmojiText text={displayNameOf(account)} emojis={account.emojis} />
                </span>
                <span className={styles.handle}>@{account.acct}</span>
              </span>
            </Link>
            <div className={styles.actions}>
              <Button
                kind="primary"
                size="sm"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ id: account.id, action: 'authorize' })}
              >
                Approve
              </Button>
              <Button
                kind="danger--tertiary"
                size="sm"
                disabled={respond.isPending}
                onClick={() => respond.mutate({ id: account.id, action: 'reject' })}
              >
                Deny
              </Button>
            </div>
          </li>
        ))}
      </ul>
      </PaginatedList>
    </div>
  );
}
