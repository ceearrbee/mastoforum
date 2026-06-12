import { Link } from 'react-router-dom';
import type { mastodon } from 'masto';
import AvatarChip from './AvatarChip';
import EmojiText from './EmojiText';
import TagPill from './TagPill';
import { useThreadReadMap } from '../utils/readState';
import { boosterOf, displayNameOf, displayStatus, statusTitle } from '../utils/status';
import { relativeTime } from '../utils/time';
import styles from './TopicRow.module.css';

interface Props {
  post: mastodon.v1.Status;
  hideTag?: string;
  /** Heading level for the topic title, so callers keep the page hierarchy correct. */
  headingLevel?: 2 | 3 | 4;
}

export default function TopicRow({ post, hideTag, headingLevel = 3 }: Props) {
  // A boost wraps the original status; display the original everywhere.
  const display = displayStatus(post);
  const booster = boosterOf(post);
  const author = displayNameOf(display.account);
  const title = statusTitle(display);
  const tags = display.tags.filter((t) => !hideTag || t.name.toLowerCase() !== hideTag.toLowerCase());
  const readMap = useThreadReadMap();
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
        </p>
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
