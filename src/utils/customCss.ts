/**
 * Treat user-supplied custom CSS as a power-user feature with guardrails. We:
 *   - scope every rule under `.app-root` so it can't restyle the whole document
 *     (browser chrome, other embeds), mapping `html`/`body`/`:root` to the root;
 *   - drop `@import` rules (which can pull in arbitrary remote stylesheets);
 *   - strip remote `url(...)` values (http/https/protocol-relative), which would
 *     leak the user's IP / requests to third parties; `data:` URLs are kept.
 *
 * Parsing uses the platform CSSOM; a regex fallback covers environments without
 * `document` (and the case where the CSSOM can't be used).
 */

export interface SanitizedCss {
  /** Safe, scoped CSS ready to inject. */
  css: string;
  /** Set when something was stripped or the input couldn't be parsed. */
  warning?: string;
}

const REMOTE_URL = /url\(\s*(['"]?)\s*(?:https?:)?\/\/[^)]*\1\s*\)/gi;
// image-set() accepts bare quoted strings as URLs, which REMOTE_URL does not see.
const IMAGE_SET = /(?:-webkit-)?image-set\(((?:[^()]|\([^()]*\))*)\)/gi;
const REMOTE_STRING = /(['"])\s*(?:https?:)?\/\/[^'"]*\1/i;
const IMPORT_RULE = /@import\b[^;]*;/gi;
// At-rules that hold a `cssRules` list but are not conditional/layer wrappers.
const NON_GROUPING_AT_RULE = /^@(?:-\w+-)?keyframes\b|^@page\b/i;

function stripRemoteUrls(cssText: string): { text: string; stripped: boolean } {
  let stripped = false;
  const mark = () => {
    stripped = true;
    return 'none';
  };
  const text = cssText
    .replace(REMOTE_URL, mark)
    .replace(IMAGE_SET, (match, body: string) => (REMOTE_STRING.test(body) ? mark() : match));
  return { text, stripped };
}

/** Splits a selector list on top-level commas, ignoring ones in (), [] or strings. */
function splitSelectors(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(selectorText.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(selectorText.slice(start));
  return parts;
}

function scopeSelector(selectorText: string): string {
  return splitSelectors(selectorText)
    .map((part) => {
      const sel = part.trim();
      if (!sel) return sel;
      if (/^(html|body|:root)$/i.test(sel)) return '.app-root';
      if (sel === '.app-root' || sel.startsWith('.app-root ')) return sel;
      return `.app-root ${sel}`;
    })
    .filter(Boolean)
    .join(', ');
}

interface ScopeResult {
  text: string;
  blockedImport: boolean;
  strippedRemote: boolean;
}

function scopeRule(rule: CSSRule): ScopeResult {
  // CSSImportRule — disallow entirely.
  if (rule.type === CSSRule.IMPORT_RULE) {
    return { text: '', blockedImport: true, strippedRemote: false };
  }

  // CSSStyleRule — scope the selector, sanitize the declarations.
  if (rule.type === CSSRule.STYLE_RULE) {
    const styleRule = rule as CSSStyleRule;
    const { text, stripped } = stripRemoteUrls(styleRule.style.cssText);
    return {
      text: `${scopeSelector(styleRule.selectorText)} { ${text} }`,
      blockedImport: false,
      strippedRemote: stripped,
    };
  }

  // Grouping rules (@media, @supports, @layer, @container, …): keep the
  // prelude, recurse inside so nested style rules get scoped too.
  const nested = (rule as CSSGroupingRule).cssRules;
  if (nested && !NON_GROUPING_AT_RULE.test(rule.cssText)) {
    const brace = rule.cssText.indexOf('{');
    if (brace > 0) {
      const prelude = rule.cssText.slice(0, brace).trim();
      let blockedImport = false;
      let strippedRemote = false;
      const inner = Array.from(nested)
        .map((r) => {
          const res = scopeRule(r);
          blockedImport ||= res.blockedImport;
          strippedRemote ||= res.strippedRemote;
          return res.text;
        })
        .filter(Boolean)
        .join('\n');
      return { text: `${prelude} {\n${inner}\n}`, blockedImport, strippedRemote };
    }
  }

  // Anything else (@font-face, @keyframes, …): keep, but still strip remote urls
  // (e.g. a @font-face pulling a remote font).
  const { text, stripped } = stripRemoteUrls(rule.cssText);
  return { text, blockedImport: false, strippedRemote: stripped };
}

function regexFallback(raw: string): SanitizedCss {
  const hadImport = IMPORT_RULE.test(raw);
  const withoutImport = raw.replace(IMPORT_RULE, '');
  const { text, stripped } = stripRemoteUrls(withoutImport);
  const warning = warningFor(hadImport, stripped, false);
  return { css: text.trim(), ...(warning ? { warning } : {}) };
}

function warningFor(blockedImport: boolean, strippedRemote: boolean, parseFailed: boolean): string | undefined {
  if (parseFailed) return 'Your custom CSS could not be parsed and was not applied.';
  if (blockedImport && strippedRemote) {
    return 'Removed @import and remote url() references (not allowed for privacy/security).';
  }
  if (blockedImport) return 'Removed @import rules (not allowed).';
  if (strippedRemote) return 'Removed remote url() references (not allowed for privacy/security).';
  return undefined;
}

export function sanitizeCustomCss(raw: string): SanitizedCss {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { css: '' };

  if (typeof document === 'undefined') return regexFallback(trimmed);

  const styleEl = document.createElement('style');
  styleEl.textContent = trimmed;
  // Disabled + appended so the browser parses it into a sheet without applying it.
  styleEl.media = 'not all';
  document.head.appendChild(styleEl);
  try {
    const sheet = styleEl.sheet;
    if (!sheet) return regexFallback(trimmed);
    const rules = Array.from(sheet.cssRules);
    if (rules.length === 0) {
      return { css: '', warning: warningFor(false, false, true) };
    }
    let blockedImport = false;
    let strippedRemote = false;
    const out = rules
      .map((rule) => {
        const res = scopeRule(rule);
        blockedImport ||= res.blockedImport;
        strippedRemote ||= res.strippedRemote;
        return res.text;
      })
      .filter(Boolean)
      .join('\n');
    const warning = warningFor(blockedImport, strippedRemote, false);
    return { css: out, ...(warning ? { warning } : {}) };
  } catch {
    return regexFallback(trimmed);
  } finally {
    styleEl.remove();
  }
}
