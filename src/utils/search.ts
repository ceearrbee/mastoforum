/**
 * Helpers for the full search route (`/search`) and the header search field.
 *
 * Kept free of any React/DOM dependency so the routing decisions (which tab,
 * what URL) and the header's tag-suggest trigger stay unit-testable.
 */

/** The three `v2.search` result types, mapped to the People / Tags / Posts tabs. */
export type SearchType = 'accounts' | 'hashtags' | 'statuses';

const VALID_TYPES: readonly SearchType[] = ['accounts', 'hashtags', 'statuses'];

/** Coerce an arbitrary `?type=` value to a valid search type, defaulting to People. */
export function normalizeSearchType(raw: string | null | undefined): SearchType {
  return VALID_TYPES.includes(raw as SearchType) ? (raw as SearchType) : 'accounts';
}

/**
 * Which tab to open for a free-text query: `#tag` → Tags, `@handle` → People,
 * anything else → People (the most useful default for a word search).
 */
export function defaultTypeForQuery(q: string): SearchType {
  const trimmed = q.trim();
  if (trimmed.startsWith('#')) return 'hashtags';
  return 'accounts';
}

/** Build the `/search` path for a query, omitting `type` when it's the default. */
export function buildSearchPath(q: string, type: SearchType = 'accounts'): string {
  const base = `/search?q=${encodeURIComponent(q)}`;
  return type === 'accounts' ? base : `${base}&type=${type}`;
}

/**
 * For the header field's live tag suggestions: when the user is typing a single
 * `#tag` token, return the bare query (no `#`); otherwise `null` so the dropdown
 * stays closed. A space means they've moved past the tag, so we stop.
 */
export function tagQueryFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('#')) return null;
  const query = trimmed.slice(1);
  if (query.length === 0 || /\s/.test(query)) return null;
  return query;
}
