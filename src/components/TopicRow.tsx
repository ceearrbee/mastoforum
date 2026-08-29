import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import AvatarChip from './AvatarChip';
import EmojiText from './EmojiText';
import SanitizedHtml from './SanitizedHtml';
import TagPill from './TagPill';
import VisuallyHidden from './VisuallyHidden';
import { isPostCollapsed, togglePostCollapse, useCollapseMap } from '../utils/collapsedPosts';
import { useThreadReadMap } from '../utils/readState';
import { boosterOf, displayNameOf, displayStatus, statusTitle } from '../utils/status';
import { relativeTime } from '../utils/time';
import styles from './TopicRow.module.css';

interface Props {
  post: mastodon.v1.Status;
  hideTag?: string;
  /** Heading level for the topic title, so callers keep the page hierarchy correct. */
  headingLevel?: 2 | 3 | 4;
  /** Show the whole post body inline instead of just the title preview. */
  expanded?: boolean;
  /** Style tabletop blocks in the expanded body (see the `tabletopTools` setting). */
  enhanceTabletop?: boolean;
}

export default function TopicRow({
  post,
  hideTag,
  headingLevel = 3,
  expanded = false,
  enhanceTabletop = false,
}: Props) {
  // A boost wraps the original status; display the original everywhere.
  const display = displayStatus(post);
  const booster = boosterOf(post);
  const author = displayNameOf(display.account);
  const title = statusTitle(display);
  const tags = display.tags.filter((t) => !hideTag || t.name.toLowerCase() !== hideTag.toLowerCase());
  const readMap = useThreadReadMap();
  // The `expanded` prop is only the default; a per-post override wins, so any
  // single row can be collapsed (or opened) without changing the whole list.
  const collapseMap = useCollapseMap();
  const collapsed = isPostCollapsed(collapseMap, post.id, !expanded);
  const showBody = !collapsed && !!display.content;
  const seen = readMap[display.id];
  const newReplies = seen ? Math.max(0, display.repliesCount - seen.seenReplies) : 0;
  const Heading = `h${headingLevel}` as const;

  // Semantic card: the link sits only on the title; a CSS `::after` overlay makes
  // the whole card clickable without nesting other links (e.g. TagPill) inside an
  // anchor, which would be invalid HTML.
  return (
    <article className={styles.row}>
      <AvatarChip account={display.account} size="md" />
      <div className={styles.body}>
        {booster && (
          <p className={styles.boostedBy}>
            🔁 <EmojiText text={`${displayNameOf(booster)} boosted`} emojis={booster.emojis} />
          </p>
        )}
        <Heading className={styles.title}>
          <Link to={`/thread/${encodeURIComponent(display.id)}`} className={styles.titleLink}>
            {title}
          </Link>
        </Heading>
        <p className={styles.byline}>
          <span>
            <EmojiText text={author} emojis={display.account.emojis} />
          </span>
          <span aria-hidden="true">·</span>
          <span>@{display.account.acct}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={display.createdAt}>{relativeTime(display.createdAt)}</time>
          {display.content && (
            <button
              type="button"
              className={styles.collapseToggle}
              aria-expanded={showBody}
              aria-controls={`topic-body-${display.id}`}
              title={showBody ? 'Collapse post' : 'Expand post'}
              onClick={() => togglePostCollapse(post.id, !expanded)}
            >
              {showBody ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <VisuallyHidden>{showBody ? 'Collapse post' : 'Expand post'}</VisuallyHidden>
            </button>
          )}
        </p>
        {showBody && (
          <SanitizedHtml
            id={`topic-body-${display.id}`}
            className={`${styles.expandedBody} post-content`}
            html={display.content}
            emojis={display.emojis}
            enhanceTabletop={enhanceTabletop}
          />
        )}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 4).map((tag) => (
              <TagPill key={tag.name} name={tag.name} />
            ))}
          </div>
        )}
      </div>
      <div className={styles.replies}>
        <span className={styles.repliesCount}>{display.repliesCount}</span>
        <span className={styles.repliesLabel}>Replies</span>
        {newReplies > 0 && (
          <span className={styles.newBadge} aria-label={`${newReplies} new replies`}>
            +{newReplies} new
          </span>
        )}
      </div>
    </article>
  );
}
