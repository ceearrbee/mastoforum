import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useThread, type ThreadData } from './useThread';

const credentials = { url: 'https://home.example', token: 't' };

/**
 * Mirror masto's action proxy: an action like `favourite` is callable, but
 * accessing `call`/`apply`/`bind` on it yields `undefined` (masto's proxy lists
 * them as SPECIAL_PROPERTIES). A plain `vi.fn()` has a real `.call`, so it would
 * hide the very bug this test guards against — hence the hand-rolled proxy.
 */
const PROXY_SPECIAL = new Set(['then', 'catch', 'finally', 'call', 'apply', 'bind']);
function mastoAction(impl: () => Promise<unknown>) {
  return new Proxy(impl, {
    get(target, prop) {
      if (typeof prop === 'string' && PROXY_SPECIAL.has(prop)) return undefined;
      return Reflect.get(target, prop);
    },
  });
}

const favourite = vi.fn(() => Promise.resolve({} as mastodon.v1.Status));
const select = vi.fn(() => ({ favourite: mastoAction(favourite) }));
const client = { v1: { statuses: { $select: select } } } as unknown as mastodon.rest.Client;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ client, credentials }),
}));
// Keep the live-update effect inert: no streaming URL → it returns early.
vi.mock('../../utils/instanceConfig', () => ({ getStreamingUrl: () => '' }));

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mainPost = {
  id: 'p1',
  favourited: false,
  favouritesCount: 0,
} as unknown as mastodon.v1.Status;

describe('useThread handleAction', () => {
  it('invokes the masto action and leaves no error', async () => {
    favourite.mockClear();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData<ThreadData>(['thread', 'p1'], {
      mainPost,
      ancestors: [],
      descendants: [],
    });

    const { result } = renderHook(() => useThread('p1', { onRootDeleted: () => {} }), {
      wrapper: wrapper(qc),
    });

    await result.current.handleAction('p1', 'favourite');

    expect(favourite).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.actionError).toBeNull());
  });
});
