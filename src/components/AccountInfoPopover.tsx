/*
 * The popover uses role="dialog" rather than the native <dialog> element: it is a
 * non-modal, custom-positioned overlay dismissed on outside-click, not a modal with
 * a backdrop, so <dialog>'s show/showModal semantics don't fit. The role is intentional.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { mastodon } from 'masto';
import AccountActionMenu from './AccountActionMenu';
import AvatarChip from './AvatarChip';
import EmojiText from './EmojiText';
import SanitizedHtml from './SanitizedHtml';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../utils/useFocusTrap';
import { hostOf } from '../utils/handles';
import styles from './AccountInfoPopover.module.css';

type AccountLike = Pick<
  mastodon.v1.Account,
  | 'acct'
  | 'displayName'
  | 'username'
  | 'avatar'
  | 'note'
  | 'followersCount'
  | 'followingCount'
  | 'statusesCount'
  | 'url'
> & {
  id?: string;
  emojis?: ReadonlyArray<mastodon.v1.CustomEmoji>;
};

interface Props {
  account: AccountLike;
  /** Optional custom trigger; defaults to an AvatarChip + display name. */
  children?: ReactNode;
}

export default function AccountInfoPopover({ account, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const { credentials } = useAuth();
  useFocusTrap(popoverRef, open);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const homeServer = credentials ? hostOf(credentials.url) : '';
  const isLocal = account.acct === account.username;
  const handle = isLocal && homeServer
    ? `@${account.username}@${homeServer}`
    : `@${account.acct}`;

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
      >
        {children ?? (
          <>
            <AvatarChip account={account} size="md" />
            <span>
              <EmojiText
                text={account.displayName || account.username}
                emojis={account.emojis}
              />
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={styles.popover}
          id={popoverId}
          // An anchored popover: native <dialog> would move it to the top layer
          // and break the anchor positioning, so the role is intentional.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="dialog"
          aria-label="Account information"
          tabIndex={-1}
        >
          <div className={styles.identity}>
            <AvatarChip account={account} size="lg" />
            <div className={styles.names}>
              <span className={styles.displayName}>
                <EmojiText
                  text={account.displayName || account.username}
                  emojis={account.emojis}
                />
              </span>
              <span className={styles.handle}>{handle}</span>
            </div>
          </div>

          {account.note && (
            <SanitizedHtml
              className={styles.bio}
              html={account.note}
              emojis={account.emojis}
            />
          )}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{account.statusesCount}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{account.followersCount}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{account.followingCount}</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>

          <div className={styles.footer}>
            {account.url && (
              <a
                className={styles.profileLink}
                href={account.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View full profile ↗
              </a>
            )}
            {account.id && (
              <AccountActionMenu
                account={{ id: account.id, acct: account.acct }}
                showFollowButton={false}
                size="sm"
              />
            )}
          </div>
        </div>
      )}
    </span>
  );
}
