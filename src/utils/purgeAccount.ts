import type { QueryClient, QueryKey } from '@tanstack/react-query';

// Cached query roots that hold statuses from other people's timelines. Bookmarks,
// favourites and profile pages stay: muting does not remove those server-side.
// `search` is absent on purpose: it pages by offset, so trimming pages corrupts it.
const STATUS_ROOTS = new Set(['feed', 'board', 'listTimeline', 'thread']);

const holdsStatuses = (key: QueryKey) =>
  STATUS_ROOTS.has(String(key[0])) || (key[0] === 'trends' && key[1] === 'statuses');

interface StatusLike {
  account?: { id?: string };
  reblog?: { account?: { id?: string } } | null;
}

const isFrom = (accountId: string) => (item: unknown) => {
  const s = item as StatusLike;
  return s?.account?.id === accountId || s?.reblog?.account?.id === accountId;
};

/** Filter an array, returning the same array when nothing matched. */
function without<T>(items: T[], accountId: string): T[] {
  const matches = isFrom(accountId);
  const kept = items.filter((item) => !matches(item));
  return kept.length === items.length ? items : kept;
}

/** Strip the account from one infinite-query page: a status array or `{ topics, ... }`. */
function stripPage(page: unknown, accountId: string): unknown {
  if (Array.isArray(page)) return without(page, accountId);
  if (page && typeof page === 'object' && Array.isArray((page as { topics?: unknown }).topics)) {
    const p = page as { topics: unknown[] };
    const topics = without(p.topics, accountId);
    return topics === p.topics ? page : { ...p, topics };
  }
  return page;
}

function stripData(data: unknown, accountId: string): unknown {
  if (Array.isArray(data)) return without(data, accountId);
  if (!data || typeof data !== 'object') return data;

  const d = data as Record<string, unknown>;
  if (Array.isArray(d.pages)) {
    const pages = d.pages as unknown[];
    const pageParams = (d.pageParams as unknown[] | undefined) ?? [];
    const nextPages: unknown[] = [];
    const nextParams: unknown[] = [];
    let changed = false;
    pages.forEach((page, i) => {
      const next = stripPage(page, accountId);
      if (next !== page) changed = true;
      // A flat page emptied by the purge goes away; a cursor taken from the last
      // item of an empty page would stop pagination. Feed pages carry a raw lastId.
      if (Array.isArray(next) && next.length === 0 && Array.isArray(page) && page.length > 0) return;
      // The first surviving page keeps the original first param: a refetch
      // restarts from pageParams[0], not from a later page's cursor.
      nextParams.push(nextPages.length === 0 ? pageParams[0] : pageParams[i]);
      nextPages.push(next);
    });
    return changed ? { ...d, pages: nextPages, pageParams: nextParams } : data;
  }

  // Thread context: keep the main post, drop the account's replies and ancestors.
  if (Array.isArray(d.ancestors) && Array.isArray(d.descendants)) {
    const ancestors = without(d.ancestors, accountId);
    const descendants = without(d.descendants, accountId);
    return ancestors === d.ancestors && descendants === d.descendants
      ? data
      : { ...d, ancestors, descendants };
  }
  return data;
}

/**
 * After muting or blocking an account, drop its statuses (and boosts of it) from
 * every cached timeline, board, list and thread query so they vanish without a
 * refetch. Lists left with no pages, and offset-paged searches, are refetched.
 */
export function purgeAccountStatuses(queryClient: QueryClient, accountId: string): void {
  queryClient.setQueriesData({ predicate: (q) => holdsStatuses(q.queryKey) }, (data) =>
    stripData(data, accountId),
  );
  queryClient.invalidateQueries({
    predicate: (q) => {
      const data = q.state.data as { pages?: unknown[] } | undefined;
      return holdsStatuses(q.queryKey) && Array.isArray(data?.pages) && data.pages.length === 0;
    },
  });
  queryClient.invalidateQueries({ queryKey: ['search'] });
  queryClient.invalidateQueries({ queryKey: ['mutes'] });
}
