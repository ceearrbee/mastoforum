import type { mastodon } from 'masto';
import SanitizedHtml from './SanitizedHtml';
import { displayNameOf, previewText, QUOTE_PREVIEW_CHARS } from '../utils/status';
import styles from './QuoteContext.module.css';

interface Props {
  post: mastodon.v1.Status;
  /** When true, this is a native quote post rather than an out-of-order reply. */
  isQuote?: boolean;
}

export default function QuoteContext({ post, isQuote = false }: Props) {
  const preview = previewText(post, QUOTE_PREVIEW_CHARS);
  const author = displayNameOf(post.account);

  return (
    <details className={styles.quote}>
      <summary className={styles.summary}>
        <span className={styles.caret} aria-hidden="true">▸</span>
        <span>
          {isQuote ? 'Quoting' : 'In reply to'} <span className={styles.author}>{author}</span>
        </span>
        <span className={styles.preview}>“{preview}”</span>
      </summary>
      <SanitizedHtml className={styles.body} html={post.content} />
      <div style={{ marginTop: '0.5rem' }}>
        <a href={`#post-${post.id}`} style={{ color: 'var(--cds-link-primary)', fontSize: '0.75rem' }}>
          Jump to post
        </a>
      </div>
    </details>
  );
}
