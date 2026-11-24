import type { mastodon } from 'masto';
import { isUnprocessable } from './apiErrors';

type Visibility = 'public' | 'unlisted' | 'private' | 'direct';

// Higher is stricter; 'local' is a public post kept on the home instance.
const STRICTNESS: Record<Visibility | 'local', number> = {
  public: 0,
  local: 0,
  unlisted: 1,
  private: 2,
  direct: 3,
};

/** The stricter of a preferred visibility and the post being replied to (direct > private > unlisted > public). */
export function stricterVisibility<T extends Visibility | 'local'>(
  preferred: T,
  parent: Visibility | undefined,
): T | Visibility {
  if (!parent) return preferred;
  return STRICTNESS[parent] > STRICTNESS[preferred] ? parent : preferred;
}

/**
 * Post a status, transparently falling back to `unlisted` when the instance
 * rejects a `local`-only visibility (vanilla Mastodon doesn't support it, and
 * answers 422). Params are loosely typed because `visibility: 'local'` isn't in
 * masto's `CreateStatusParams` union.
 */
export async function createStatusWithLocalFallback(
  client: mastodon.rest.Client,
  params: Record<string, unknown>,
): Promise<mastodon.v1.Status> {
  // masto's `CreateStatusParams` type omits instance-specific fields like
  // `visibility: 'local'`, so the loosely-typed params are bridged via `unknown`.
  const create = (p: Record<string, unknown>) => {
    const params: unknown = p;
    return client.v1.statuses.create(params as mastodon.rest.v1.CreateStatusParams);
  };
  try {
    return await create(params);
  } catch (err) {
    if (params.visibility === 'local' && isUnprocessable(err)) {
      return create({ ...params, visibility: 'unlisted' });
    }
    throw err;
  }
}
