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
}

export default function SanitizedHtml({ html, className, emojis = [] }: Props) {
  const safe = useMemo(() => sanitizeStatusHtml(html, emojis), [html, emojis]);
  // `safe` is run through DOMPurify (see sanitizeStatusHtml); the markup is
  // already sanitized, so this dangerouslySetInnerHTML is the intended sink.
  // eslint-disable-next-line security/dangerously-set-innerhtml
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
