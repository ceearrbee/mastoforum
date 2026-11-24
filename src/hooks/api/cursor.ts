/**
 * Shared helpers for Mastodon's cursor-based (maxId) pagination, so the
 * infinite-query hooks don't each re-declare identical `getNextPageParam` /
 * param-building logic.
 */

/** `getNextPageParam`: stop when a page is empty, else page from the last id. */
export const cursorNextParam = (lastPage: { id: string }[]): string | undefined =>
  lastPage.length === 0 ? undefined : lastPage[lastPage.length - 1].id;

/** Build list params, adding `maxId` only when paging past the first page. */
export function listParams(
  pageParam: string | undefined,
  limit: number,
): { limit: number; maxId?: string } {
  const params: { limit: number; maxId?: string } = { limit };
  if (pageParam) params.maxId = pageParam;
  return params;
}

/**
 * Next `max_id` from a response's `Link` header. Needed for endpoints (mutes,
 * blocks) whose cursor is a relationship id, not the last account's id.
 */
export function linkNextMaxId(link: string | null): string | undefined {
  const next = link?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1];
  if (!next) return undefined;
  try {
    return new URL(next).searchParams.get('max_id') ?? undefined;
  } catch {
    return undefined;
  }
}
