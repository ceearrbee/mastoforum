import type { mastodon } from 'masto';

export interface OrderedPost {
  post: mastodon.v1.Status;
  depth: number;
}

export function buildOrdered(
  ancestors: mastodon.v1.Status[],
  main: mastodon.v1.Status,
  descendants: mastodon.v1.Status[],
): OrderedPost[] {
  const ordered: OrderedPost[] = [];
  for (const a of ancestors) ordered.push({ post: a, depth: 0 });
  ordered.push({ post: main, depth: 0 });

  const knownIds = new Set<string>([main.id, ...descendants.map((d) => d.id)]);
  const byParent = new Map<string, mastodon.v1.Status[]>();
  for (const d of descendants) {
    // Orphans whose parent isn't in this context (deleted, server-side filtered,
    // or never federated) are reparented onto the main post so they still render.
    const parentId = d.inReplyToId && knownIds.has(d.inReplyToId) ? d.inReplyToId : main.id;
    const list = byParent.get(parentId) ?? [];
    list.push(d);
    byParent.set(parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const walk = (parentId: string, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      ordered.push({ post: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(main.id, 1);
  return ordered;
}

export interface FlatPost {
  post: mastodon.v1.Status;
  /** Set when this post replies to a non-adjacent post; UI shows a quote of it. */
  quoteOf?: mastodon.v1.Status;
}

/**
 * Build a flat chronological view of the thread.
 *
 * A reply gets a `quoteOf` reference whenever its `inReplyToId` is not the
 * immediately preceding rendered post — so readers see the context for
 * out-of-order replies without losing the linear flow.
 */
export function buildFlat(
  ancestors: mastodon.v1.Status[],
  main: mastodon.v1.Status,
  descendants: mastodon.v1.Status[],
): FlatPost[] {
  const everyPost = [...ancestors, main, ...descendants];
  const byId = new Map<string, mastodon.v1.Status>();
  for (const p of everyPost) byId.set(p.id, p);

  const ordered = everyPost.slice().sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return ta - tb;
  });

  const result: FlatPost[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const post = ordered[i];
    const previous = i > 0 ? ordered[i - 1] : null;
    let quoteOf: mastodon.v1.Status | undefined;
    if (post.inReplyToId && (!previous || previous.id !== post.inReplyToId)) {
      quoteOf = byId.get(post.inReplyToId) ?? undefined;
    }
    result.push(quoteOf ? { post, quoteOf } : { post });
  }
  return result;
}
