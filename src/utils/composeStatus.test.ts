import { describe, expect, it, vi } from 'vitest';
import type { mastodon } from 'masto';
import { createStatusWithLocalFallback } from './composeStatus';

function clientWith(create: (params: unknown) => Promise<unknown>) {
  return { v1: { statuses: { create } } } as unknown as mastodon.rest.Client;
}

describe('createStatusWithLocalFallback', () => {
  it('posts the status and returns the result', async () => {
    const create = vi.fn(async () => ({ id: '1' }));
    const res = await createStatusWithLocalFallback(clientWith(create), {
      status: 'hi',
      visibility: 'public',
    });
    expect(res).toEqual({ id: '1' });
    expect(create).toHaveBeenCalledOnce();
  });

  it('retries as unlisted when a local-only post is rejected with 422', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 422 })
      .mockResolvedValueOnce({ id: '2' });
    const res = await createStatusWithLocalFallback(clientWith(create), {
      status: 'hi',
      visibility: 'local',
    });
    expect(res).toEqual({ id: '2' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toMatchObject({ visibility: 'unlisted' });
  });

  it('rethrows a 422 when the visibility was not local', async () => {
    const create = vi.fn().mockRejectedValue({ statusCode: 422 });
    await expect(
      createStatusWithLocalFallback(clientWith(create), { status: 'hi', visibility: 'public' }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(create).toHaveBeenCalledOnce();
  });

  it('rethrows non-422 errors without retrying', async () => {
    const create = vi.fn().mockRejectedValue({ statusCode: 500 });
    await expect(
      createStatusWithLocalFallback(clientWith(create), { status: 'hi', visibility: 'local' }),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(create).toHaveBeenCalledOnce();
  });
});
