import { Link } from 'react-router-dom';
import { Button } from '@carbon/react';
import { useAuth } from '../context/AuthContext';
import { useAccountRelationshipActions, useMutes, type MutedAccount } from '../hooks/api';
import AvatarChip from '../components/AvatarChip';
import EmojiText from '../components/EmojiText';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import { displayNameOf } from '../utils/status';
import { pushToast } from '../utils/toast';
import styles from './MutedAccounts.module.css';

function MutedRow({ account }: { account: MutedAccount }) {
  const { unmute, isPending } = useAccountRelationshipActions(account, {
    onError: (message) =>
      pushToast({ kind: 'error', title: `Failed to unmute @${account.acct}`, subtitle: message }),
  });

  return (
    <li className={styles.item}>
      <Link to={`/@${encodeURIComponent(account.acct)}`} className={styles.who}>
        <AvatarChip account={account} size="md" />
        <span className={styles.names}>
          <span className={styles.displayName}>
            <EmojiText text={displayNameOf(account)} emojis={account.emojis} />
          </span>
          <span className={styles.handle}>@{account.acct}</span>
          {account.muteExpiresAt && (
            <span className={styles.expiry}>
              Muted until{' '}
              <time dateTime={account.muteExpiresAt}>
                {new Date(account.muteExpiresAt).toLocaleString()}
              </time>
            </span>
          )}
        </span>
      </Link>
      <Button
        kind="tertiary"
        size="sm"
        disabled={isPending}
        aria-label={`Unmute @${account.acct}`}
        onClick={unmute}
      >
        Unmute
      </Button>
    </li>
  );
}

export default function MutedAccounts() {
  const { credentials } = useAuth();
  const { items, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMutes();

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Muted accounts</PageHeading>
        <p className={styles.empty}>Sign in to manage muted accounts.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Muted accounts</PageHeading>

      <PaginatedList
        items={items}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load muted accounts"
        emptyMessage="You have not muted anyone."
        emptyClassName={styles.empty}
        skeletonRows={4}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        <ul className={styles.list}>
          {items.map((account) => (
            <MutedRow key={account.id} account={account} />
          ))}
        </ul>
      </PaginatedList>
    </div>
  );
}
