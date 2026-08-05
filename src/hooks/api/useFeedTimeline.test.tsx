import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useFeedTimeline } from './useFeedTimeline';

const status = (id: string, inReplyToId: string | null = null) =>
  ({ id, inReplyToId }) as unknown as mastodon.v1.Status;

const homeList = vi.fn(async () => [status('h1'), status('h2', 'x')]);
const publicList = vi.fn(async () => [status('p1')]);
const client = {
  v1: { timelines: { home: { list: homeList }, public: { list: publicList } } },
} as unknown as mastodon.rest.Client;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ client, credentials: { url: 'https://home.example', token: 't' } }),
}));

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useFeedTimeline', () => {
  beforeEach(() => {
    homeList.mockClear();
    publicList.mockClear();
  });

  it('calls the home timeline and filters out replies', async () => {
    const { result } = renderHook(() => useFeedTimeline('home'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe('h1');
    expect(homeList).toHaveBeenCalledWith({ limit: 40 });
    expect(publicList).not.toHaveBeenCalled();
  });

  it('passes local: true for the local source', async () => {
    const { result } = renderHook(() => useFeedTimeline('local'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(publicList).toHaveBeenCalledWith({ limit: 40, local: true });
  });

  it('omits local for the federated source', async () => {
    const { result } = renderHook(() => useFeedTimeline('federated'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(publicList).toHaveBeenCalledWith({ limit: 40 });
  });

  it('pages from the last raw status even when a page filters to zero topics', async () => {
    publicList
      .mockImplementationOnce(async () => [status('r1', 'x'), status('r2', 'x')])
      .mockImplementationOnce(async () => [status('t1')]);

    const { result } = renderHook(() => useFeedTimeline('federated'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(publicList).toHaveBeenLastCalledWith({ limit: 40, maxId: 'r2' });
    await waitFor(() => expect(result.current.items.map((p) => p.id)).toEqual(['t1']));
  });
});
