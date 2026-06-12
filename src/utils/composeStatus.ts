import type { mastodon } from 'masto';
import { isUnprocessable } from './apiErrors';

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
