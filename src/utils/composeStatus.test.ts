import { describe, expect, it, vi } from 'vitest';
import type { mastodon } from 'masto';
import { createStatusWithLocalFallback, stricterVisibility } from './composeStatus';

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

describe('stricterVisibility', () => {
  it('raises a looser preference to the parent visibility', () => {
    expect(stricterVisibility('public', 'private')).toBe('private');
    expect(stricterVisibility('public', 'direct')).toBe('direct');
    expect(stricterVisibility('unlisted', 'private')).toBe('private');
    expect(stricterVisibility('private', 'direct')).toBe('direct');
  });

  it('keeps a preference that is already as strict or stricter', () => {
    expect(stricterVisibility('direct', 'public')).toBe('direct');
    expect(stricterVisibility('private', 'unlisted')).toBe('private');
    expect(stricterVisibility('unlisted', 'unlisted')).toBe('unlisted');
    expect(stricterVisibility('public', 'public')).toBe('public');
  });

  it('treats local-only like public and returns the input when there is no parent', () => {
    expect(stricterVisibility('local', 'public')).toBe('local');
    expect(stricterVisibility('local', 'unlisted')).toBe('unlisted');
    expect(stricterVisibility('local', 'private')).toBe('private');
    expect(stricterVisibility('public', undefined)).toBe('public');
  });
});
