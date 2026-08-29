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
  /** Optional DOM id, so a collapse toggle can point `aria-controls` at the body. */
  id?: string;
  emojis?: ReadonlyArray<CustomEmoji>;
  /** Style tabletop blocks (dice, speech, OOC, stat sheets) in this body. */
  enhanceTabletop?: boolean;
}

export default function SanitizedHtml({
  html,
  className,
  id,
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
  return <div id={id} className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
