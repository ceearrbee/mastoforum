import { useState, type Ref } from 'react';
import { OverflowMenu, OverflowMenuItem, Button } from '@carbon/react';
import {
  Bookmark,
  BookmarkFilled,
  ChatLaunch,
  DataShare,
  Favorite,
  FavoriteFilled,
  Repeat,
} from '@carbon/icons-react';
import type { mastodon } from 'masto';
import AccountInfoPopover from './AccountInfoPopover';
import AvatarChip from './AvatarChip';
import EditHistoryModal from './EditHistoryModal';
import EmojiText from './EmojiText';
import MediaList from './MediaList';
import PollRenderer from './PollRenderer';
import QuoteContext from './QuoteContext';
import SanitizedHtml from './SanitizedHtml';
import VisuallyHidden from './VisuallyHidden';
import { boosterOf, displayNameOf, displayStatus } from '../utils/status';
import styles from './PostCard.module.css';

export type StatusAction =
  | 'favourite'
  | 'unfavourite'
  | 'bookmark'
  | 'unbookmark'
  | 'reblog'
  | 'unreblog';

interface Props {
  post: mastodon.v1.Status;
  index: number;
  depth?: number;
  quoteOf?: mastodon.v1.Status;
  ownAccountId?: string;
  onAction: (postId: string, action: StatusAction) => void;
  onReplyClick?: (post: mastodon.v1.Status) => void;
  onEditClick?: (post: mastodon.v1.Status) => void;
  onDeleteClick?: (post: mastodon.v1.Status) => void;
  /** Forwarded to the post's <article> so callers can focus/scroll it directly. */
  ref?: Ref<HTMLElement>;
  /** tabindex for the <article>; -1 makes it programmatically focusable for keyboard nav. */
  tabIndex?: number;
  /** Briefly highlights the card (e.g. the first unread reply). */
  highlighted?: boolean;
}

function clampDepth(depth: number): number {
  if (depth <= 0) return 0;
  return Math.min(6, depth);
}

function postUrl(post: mastodon.v1.Status): string {
  return `#post-${post.id}`;
}

export default function PostCard({
  post,
  index,
  depth = 0,
  quoteOf,
  ownAccountId,
  onAction,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  ref,
  tabIndex,
  highlighted,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const indent = clampDepth(depth);
  const className = [
    styles.card,
    indent > 0 ? styles[`indent-${indent}`] : null,
    highlighted ? styles.unreadHighlight : null,
  ]
    .filter(Boolean)
    .join(' ');
  // When the status is a boost, render the original status everywhere and keep
  // the booster's identity only for the attribution strip.
  const booster = boosterOf(post);
  const display = displayStatus(post);
  const isOwn = !!ownAccountId && display.account.id === ownAccountId;
  const edited = display.editedAt && display.editedAt !== display.createdAt;

  return (
    <article id={`post-${display.id}`} className={className} ref={ref} tabIndex={tabIndex}>
      {booster && (
        <AccountInfoPopover account={booster}>
          <span className={styles.boostedBy}>
            <Repeat size={14} />
            <EmojiText
              text={`${displayNameOf(booster)} boosted`}
              emojis={booster.emojis}
            />
          </span>
        </AccountInfoPopover>
      )}
      <header className={styles.header}>
        <AccountInfoPopover account={display.account}>
          <AvatarChip account={display.account} size="md" />
          <span className={styles.identity}>
            <span className={styles.author}>
              <EmojiText
                text={displayNameOf(display.account)}
                emojis={display.account.emojis}
              />
            </span>
            <span className={styles.acct}>@{display.account.acct}</span>
          </span>
        </AccountInfoPopover>
        <div className={styles.meta}>
          <a href={postUrl(display)}>
            <time dateTime={display.createdAt}>{new Date(display.createdAt).toLocaleString()}</time>
          </a>
          <div className={styles.metaRow}>
            <span>#{index + 1}</span>
            {edited && (
              <button
                type="button"
                className={styles.editedTag}
                onClick={() => setHistoryOpen(true)}
                title="View edit history"
              >
                edited
              </button>
            )}
            {isOwn && (onEditClick || onDeleteClick) && (
              <OverflowMenu size="sm" iconDescription="Post actions" flipped>
                {onEditClick && (
                  <OverflowMenuItem itemText="Edit" onClick={() => onEditClick(display)} />
                )}
                {onDeleteClick && (
                  <OverflowMenuItem
                    itemText="Delete"
                    isDelete
                    hasDivider={!!onEditClick}
                    onClick={() => onDeleteClick(display)}
                  />
                )}
              </OverflowMenu>
            )}
          </div>
        </div>
      </header>

      {quoteOf && <QuoteContext post={quoteOf} />}

      {display.spoilerText ? (
        <details className={styles.spoiler}>
          <summary>{display.spoilerText}</summary>
          <SanitizedHtml
            className={`${styles.body} post-content`}
            html={display.content}
            emojis={display.emojis}
          />
        </details>
      ) : (
        <SanitizedHtml
          className={`${styles.body} post-content`}
          html={display.content}
          emojis={display.emojis}
        />
      )}

      {display.poll && <PollRenderer poll={display.poll} statusId={display.id} />}

      {display.mediaAttachments.length > 0 && <MediaList media={display.mediaAttachments} />}

      <div className={styles.actions}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={display.favourited ? FavoriteFilled : Favorite}
          onClick={() => onAction(display.id, display.favourited ? 'unfavourite' : 'favourite')}
          className={display.favourited ? styles['actionActive--favourite'] : undefined}
          aria-pressed={!!display.favourited}
        >
          {display.favouritesCount || 'Like'}
          {display.favourited && <VisuallyHidden>(liked)</VisuallyHidden>}
        </Button>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={DataShare}
          onClick={() => onAction(display.id, display.reblogged ? 'unreblog' : 'reblog')}
          className={display.reblogged ? styles['actionActive--reblog'] : undefined}
          aria-pressed={!!display.reblogged}
        >
          {display.reblogsCount || 'Boost'}
          {display.reblogged && <VisuallyHidden>(boosted)</VisuallyHidden>}
        </Button>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={display.bookmarked ? BookmarkFilled : Bookmark}
          onClick={() => onAction(display.id, display.bookmarked ? 'unbookmark' : 'bookmark')}
          className={display.bookmarked ? styles['actionActive--bookmark'] : undefined}
          aria-pressed={!!display.bookmarked}
        >
          Save
          {display.bookmarked && <VisuallyHidden>(saved)</VisuallyHidden>}
        </Button>
        <span className={styles.spacer} />
        {onReplyClick && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ChatLaunch}
            onClick={() => onReplyClick(display)}
          >
            Reply
          </Button>
        )}
      </div>

      {edited && (
        <EditHistoryModal
          statusId={display.id}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </article>
  );
}
