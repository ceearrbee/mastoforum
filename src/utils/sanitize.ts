import DOMPurify, { type Config } from 'dompurify';
import { enhanceTabletopHtml } from './ttrpg/render';

const STATUS_HTML_CONFIG: Config = {
  // No <img>: custom emoji are inserted after sanitizing, so remote markup never gets one.
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'a', 'em', 'strong', 'i', 'b', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'class', 'lang', 'alt', 'title'],
  ALLOW_DATA_ATTR: false,
};

// Classes Mastodon emits in post HTML; anything else could hit app (cds--*) styles.
const ALLOWED_CLASSES = new Set([
  'h-card', 'u-url', 'mention', 'hashtag', 'invisible', 'ellipsis', 'quote-inline',
]);

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof HTMLAnchorElement) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
  if (node.hasAttribute('class')) {
    const kept = Array.from(node.classList).filter((c) => ALLOWED_CLASSES.has(c));
    if (kept.length > 0) node.setAttribute('class', kept.join(' '));
    else node.removeAttribute('class');
  }
});

interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl?: string;
}

const SHORTCODE = /:([a-zA-Z0-9_]+):/g;

/** Replaces `:code:` in text nodes only, so attribute values are never touched. */
function replaceShortcodes(root: DocumentFragment, emojis: ReadonlyArray<CustomEmoji>): void {
  const byCode = new Map(
    emojis.filter((e) => /^https?:\/\//i.test(e.url)).map((e) => [e.shortcode, e]),
  );
  if (byCode.size === 0) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) textNodes.push(n as Text);
  for (const textNode of textNodes) {
    const text = textNode.data;
    const parts: Array<string | HTMLImageElement> = [];
    let last = 0;
    for (const m of text.matchAll(SHORTCODE)) {
      const emoji = byCode.get(m[1]);
      if (!emoji) continue;
      parts.push(text.slice(last, m.index));
      const img = doc.createElement('img');
      img.setAttribute('class', 'custom-emoji');
      img.setAttribute('src', emoji.url);
      img.setAttribute('alt', m[0]);
      img.setAttribute('title', m[0]);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      parts.push(img);
      last = m.index + m[0].length;
    }
    if (parts.length === 0) continue;
    parts.push(text.slice(last));
    textNode.replaceWith(...parts);
  }
}

export interface SanitizeOptions {
  /**
   * Wrap the plain-text tabletop conventions (dice, speech, OOC, stat blocks)
   * in styling hooks. Off unless the reader has opted in — see the
   * `tabletopTools` setting.
   */
  enhanceTabletop?: boolean;
}

export function sanitizeStatusHtml(
  html: string,
  emojis: ReadonlyArray<CustomEmoji> = [],
  options: SanitizeOptions = {},
): string {
  const fragment = DOMPurify.sanitize(html ?? '', { ...STATUS_HTML_CONFIG, RETURN_DOM_FRAGMENT: true });
  replaceShortcodes(fragment, emojis);
  const holder = fragment.ownerDocument.createElement('div');
  holder.appendChild(fragment);
  const safe = holder.innerHTML;
  // Runs on the sanitized output using DOM APIs only, so it can't reintroduce
  // anything the allow-list just removed.
  return options.enhanceTabletop ? enhanceTabletopHtml(safe) : safe;
}

/** Plain text of an HTML snippet: entities decoded, <br> and paragraph breaks as newlines. */
export function stripHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: ['p', 'br'],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  fragment.querySelectorAll('p').forEach((p) => p.after('\n\n'));
  return (fragment.textContent ?? '').trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
