import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../hooks/api';
import AvatarChip from '../components/AvatarChip';
import EmojiText from '../components/EmojiText';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import { stripHtml, truncate } from '../utils/sanitize';
import { displayNameOf } from '../utils/status';
import { relativeTime } from '../utils/time';
import styles from './Messages.module.css';

export default function Messages() {
  const { credentials } = useAuth();
  const {
    items: conversations,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations();

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Messages</PageHeading>
        <p className={styles.empty}>Sign in to see your messages.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Messages</PageHeading>

      <PaginatedList
        items={conversations}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load messages"
        emptyMessage="No direct conversations yet."
        emptyClassName={styles.empty}
        skeletonRows={5}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
      <ul className={styles.list}>
        {conversations.map((c) => {
          // Mastodon excludes the current user from a conversation's account
          // list; a note-to-self conversation can therefore come back empty.
          const participants = c.accounts;
          const lead = participants[0];
          const names = participants.length
            ? participants.map(displayNameOf).join(', ')
            : 'Just you';
          const preview = c.lastStatus
            ? truncate(stripHtml(c.lastStatus.content), 120)
            : 'No messages';
          return (
            <li key={c.id} className={`${styles.item} ${c.unread ? styles.unreadItem : ''}`}>
              <Link
                to={
                  c.lastStatus
                    ? `/thread/${encodeURIComponent(c.lastStatus.id)}`
                    : lead
                      ? `/@${encodeURIComponent(lead.acct)}`
                      : '#'
                }
                className={styles.link}
              >
                {lead ? (
                  <AvatarChip account={lead} size="md" />
                ) : (
                  <span className={styles.avatarPlaceholder} aria-hidden="true" />
                )}
                <div className={styles.body}>
                  <p className={styles.names}>
                    <EmojiText text={names} emojis={lead?.emojis} />
                    {c.lastStatus && (
                      <span className={styles.time}>
                        {' · '}
                        {relativeTime(c.lastStatus.createdAt)}
                      </span>
                    )}
                  </p>
                  <p className={styles.preview}>{preview}</p>
                </div>
                {c.unread && <span className={styles.unreadDot} aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
      </PaginatedList>
    </div>
  );
}
