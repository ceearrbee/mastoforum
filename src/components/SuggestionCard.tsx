import { Link } from 'react-router-dom';
import { IconButton } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import AvatarChip from './AvatarChip';
import EmojiText from './EmojiText';
import AccountActionMenu from './AccountActionMenu';
import { stripHtml, truncate } from '../utils/sanitize';
import styles from './SuggestionCard.module.css';

interface Props {
  suggestion: mastodon.v1.Suggestion;
  onDismiss: () => void;
}

const BIO_CHARS = 120;

/** A single "who to follow" card; dismissing it removes the suggestion server-side. */
export default function SuggestionCard({ suggestion, onDismiss }: Props) {
  const { account } = suggestion;
  const name = account.displayName || account.username;
  const bio = truncate(stripHtml(account.note ?? ''), BIO_CHARS);

  return (
    <div className={styles.card}>
      <IconButton
        kind="ghost"
        size="sm"
        label="Dismiss suggestion"
        className={styles.dismiss}
        onClick={onDismiss}
      >
        <Close size={16} />
      </IconButton>

      <Link to={`/@${encodeURIComponent(account.acct)}`} className={styles.head}>
        <AvatarChip account={account} size="lg" />
        <span className={styles.names}>
          <span className={styles.name}>
            <EmojiText text={name} emojis={account.emojis} />
          </span>
          <span className={styles.acct}>@{account.acct}</span>
        </span>
      </Link>

      {bio && <p className={styles.bio}>{bio}</p>}

      <div className={styles.actions}>
        <AccountActionMenu account={{ id: account.id, acct: account.acct }} size="sm" />
      </div>
    </div>
  );
}
