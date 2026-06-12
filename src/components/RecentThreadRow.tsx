import { Link } from 'react-router-dom';
import AvatarChip from './AvatarChip';
import type { RecentThread } from '../utils/recentThreads';
import { relativeTime } from '../utils/time';
import styles from './RecentThreadRow.module.css';

interface Props {
  thread: RecentThread;
}

export default function RecentThreadRow({ thread }: Props) {
  const account = thread.account ?? null;

  return (
    <Link to={`/thread/${encodeURIComponent(thread.id)}`} className={styles.row}>
      {account ? (
        <AvatarChip account={account} size="md" />
      ) : (
        <span style={{ width: 32, height: 32 }} />
      )}
      <div className={styles.body}>
        <h3 className={styles.title}>{thread.title}</h3>
        <p className={styles.byline}>
          {account && (
            <>
              <span>{account.displayName}</span>
              <span aria-hidden="true">·</span>
              <span>@{account.acct}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {thread.primaryTag && (
            <>
              <span className={styles.tag}>#{thread.primaryTag}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>Viewed {relativeTime(thread.viewedAt)}</span>
        </p>
      </div>
      {typeof thread.repliesCount === 'number' && (
        <div className={styles.replies}>
          <span className={styles.repliesCount}>{thread.repliesCount}</span>
          <span className={styles.repliesLabel}>Replies</span>
        </div>
      )}
    </Link>
  );
}
