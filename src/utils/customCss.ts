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
const IMPORT_RULE = /@import\b[^;]*;/gi;

function stripRemoteUrls(cssText: string): { text: string; stripped: boolean } {
  let stripped = false;
  const text = cssText.replace(REMOTE_URL, () => {
    stripped = true;
    return 'none';
  });
  return { text, stripped };
}

function scopeSelector(selectorText: string): string {
  return selectorText
    .split(',')
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

  // Grouping rules (@media, @supports) — keep the wrapper, recurse inside.
  if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
    const groupRule = rule as CSSGroupingRule;
    const condition = (groupRule as CSSMediaRule).conditionText ?? '';
    const keyword = rule.type === CSSRule.MEDIA_RULE ? '@media' : '@supports';
    let blockedImport = false;
    let strippedRemote = false;
    const inner = Array.from(groupRule.cssRules)
      .map((r) => {
        const res = scopeRule(r);
        blockedImport ||= res.blockedImport;
        strippedRemote ||= res.strippedRemote;
        return res.text;
      })
      .filter(Boolean)
      .join('\n');
    return { text: `${keyword} ${condition} {\n${inner}\n}`, blockedImport, strippedRemote };
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
