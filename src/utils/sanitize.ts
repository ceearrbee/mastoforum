import DOMPurify, { type Config } from 'dompurify';

const STATUS_HTML_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'a', 'em', 'strong', 'i', 'b', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
    'img',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'class', 'lang', 'src', 'alt', 'title'],
  ALLOW_DATA_ATTR: false,
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof HTMLAnchorElement) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
  if (node instanceof HTMLImageElement) {
    // Restrict <img> to custom emoji — strip anything else.
    if (!node.classList.contains('custom-emoji')) {
      node.remove();
      return;
    }
    const src = node.getAttribute('src') ?? '';
    if (!/^https?:\/\//i.test(src)) {
      node.remove();
      return;
    }
    node.setAttribute('loading', 'lazy');
    node.setAttribute('decoding', 'async');
  }
});

interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl?: string;
}

const SHORTCODE = /:([a-zA-Z0-9_]+):/g;

function replaceShortcodes(text: string, emojis: ReadonlyArray<CustomEmoji>): string {
  if (emojis.length === 0) return text;
  const byCode = new Map(emojis.map((e) => [e.shortcode, e]));
  return text.replace(SHORTCODE, (match, code: string) => {
    const emoji = byCode.get(code);
    if (!emoji) return match;
    const src = escapeAttr(emoji.url);
    const alt = escapeAttr(`:${code}:`);
    const title = escapeAttr(`:${code}:`);
    return `<img class="custom-emoji" src="${src}" alt="${alt}" title="${title}">`;
  });
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeStatusHtml(
  html: string,
  emojis: ReadonlyArray<CustomEmoji> = [],
): string {
  const withEmojis = replaceShortcodes(html ?? '', emojis);
  return DOMPurify.sanitize(withEmojis, STATUS_HTML_CONFIG);
}

export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
