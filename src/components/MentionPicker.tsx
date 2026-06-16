/* eslint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role */
// A listbox autocomplete on <ul>/<li> — a native <select> can't render avatar
// rows or float as an overlay.
import type { mastodon } from 'masto';
import AvatarChip from './AvatarChip';
import EmojiText from './EmojiText';
import styles from './ComposerAutocomplete.module.css';

interface Props {
  accounts: mastodon.v1.Account[];
  selected: number;
  onPick: (index: number) => void;
}

/** Result rows for the composer `@`-autocomplete popover. */
export default function MentionPicker({ accounts, selected, onPick }: Props) {
  return (
    <ul className={styles.list} role="listbox" aria-label="Mention suggestions">
      {accounts.map((account, idx) => (
        <li
          key={account.id}
          role="option"
          aria-selected={idx === selected}
          className={`${styles.row} ${idx === selected ? styles.active : ''}`}
          // mousedown (not click) so we act before the editor blurs.
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(idx);
          }}
        >
          <AvatarChip account={account} size="sm" />
          <span className={styles.rowText}>
            <span className={styles.rowName}>
              <EmojiText
                text={account.displayName || account.username}
                emojis={account.emojis}
              />
            </span>
            <span className={styles.rowMeta}>@{account.acct}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
