/* eslint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role */
/*
 * This popover implements the W3C ARIA "listbox" autocomplete pattern, where the
 * list/options are roles on <ul>/<li> rather than native <select>/<option> (which
 * can't render avatars or be styled as a free-floating overlay). The roles are
 * intentional, so the prefer-native-tag heuristics don't apply here.
 */
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
