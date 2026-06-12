import type { mastodon } from 'masto';

/**
 * Assert a Mastodon REST client is available, returning it non-null.
 *
 * Data hooks gate their queries with `enabled: !!client`, so `queryFn` only runs
 * once a client exists — but reaching for the client through a bare `client!`
 * non-null assertion is brittle: a refactor that drops the `enabled` guard turns
 * a missing client into a cryptic `Cannot read properties of null` deep in a
 * masto call. Routing every access through this helper fails loudly and clearly
 * instead, and keeps the assertion in exactly one place.
 */
export function requireClient(
  client: mastodon.rest.Client | null | undefined,
): mastodon.rest.Client {
  if (!client) {
    throw new Error('Mastodon client unavailable — sign in required.');
  }
  return client;
}
