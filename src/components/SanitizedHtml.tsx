import { useMemo } from 'react';
import { sanitizeStatusHtml } from '../utils/sanitize';

interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl?: string;
}

interface Props {
  html: string;
  className?: string;
  emojis?: ReadonlyArray<CustomEmoji>;
  /** Style tabletop blocks (dice, speech, OOC, stat sheets) in this body. */
  enhanceTabletop?: boolean;
}

export default function SanitizedHtml({
  html,
  className,
  emojis = [],
  enhanceTabletop = false,
}: Props) {
  const safe = useMemo(
    () => sanitizeStatusHtml(html, emojis, { enhanceTabletop }),
    [html, emojis, enhanceTabletop],
  );
  // `safe` is run through DOMPurify (see sanitizeStatusHtml); the markup is
  // already sanitized, so this dangerouslySetInnerHTML is the intended sink.
  // eslint-disable-next-line security/dangerously-set-innerhtml
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
