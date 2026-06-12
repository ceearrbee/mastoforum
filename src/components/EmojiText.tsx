import { Fragment } from 'react';
import styles from './EmojiText.module.css';

interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl?: string;
}

interface Props {
  text: string;
  emojis?: ReadonlyArray<CustomEmoji>;
  className?: string;
}

const SHORTCODE = /:([a-zA-Z0-9_]+):/g;

export default function EmojiText({ text, emojis = [], className }: Props) {
  if (!text) return null;
  if (emojis.length === 0) {
    return <span className={className ?? styles.text}>{text}</span>;
  }
  const byCode = new Map(emojis.map((e) => [e.shortcode, e]));
  const parts: Array<string | { shortcode: string; url: string }> = [];
  let last = 0;
  for (const match of text.matchAll(SHORTCODE)) {
    const [literal, code] = match;
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const emoji = byCode.get(code);
    if (emoji) parts.push({ shortcode: code, url: emoji.url });
    else parts.push(literal);
    last = start + literal.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <span className={className ?? styles.text}>
      {parts.map((part, idx) =>
        typeof part === 'string' ? (
          <Fragment key={idx}>{part}</Fragment>
        ) : (
          <img
            key={idx}
            className="custom-emoji"
            src={part.url}
            alt={`:${part.shortcode}:`}
            title={`:${part.shortcode}:`}
            loading="lazy"
            decoding="async"
          />
        ),
      )}
    </span>
  );
}
