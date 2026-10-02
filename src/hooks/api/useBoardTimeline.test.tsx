import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useBoardTimeline } from './useBoardTimeline';

const status = (id: string, inReplyToId: string | null = null) =>
  ({ id, inReplyToId }) as unknown as mastodon.v1.Status;

const tagList = vi.fn(async () => [status('t1'), status('t2', 't1')]);
const select = vi.fn(() => ({ list: tagList }));
const client = {
  v1: { timelines: { tag: { $select: select } } },
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

describe('useBoardTimeline', () => {
  beforeEach(() => {
    select.mockClear();
    tagList.mockClear();
  });

  it('selects the tag and filters replies', async () => {
    const { result } = renderHook(() => useBoardTimeline('dnd'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe('t1');
    expect(select).toHaveBeenCalledWith('dnd');
    expect(tagList).toHaveBeenCalledWith({ limit: 40 });
  });

  it('passes all, any, and none parameters for compound boards', async () => {
    const { result } = renderHook(
      () =>
        useBoardTimeline('dnd', {
          all: ['ic'],
          any: ['dice', 'stats'],
          none: ['spam'],
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(select).toHaveBeenCalledWith('dnd');
    expect(tagList).toHaveBeenCalledWith({
      limit: 40,
      all: ['ic'],
      any: ['dice', 'stats'],
      none: ['spam'],
    });
  });
});
