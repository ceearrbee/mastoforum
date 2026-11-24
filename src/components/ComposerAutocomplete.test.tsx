import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Editor } from 'codemirror';
import type { mastodon } from 'masto';
import ComposerAutocomplete from './ComposerAutocomplete';

const search = vi.hoisted(() => vi.fn());
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: { v2: { search: { list: search } } } }),
}));

function account(acct: string): mastodon.v1.Account {
  return { id: acct, acct, username: acct, displayName: acct, avatar: '', emojis: [] } as never;
}

/** A CodeMirror stand-in: tests set `line`/`ch` and fire cursorActivity. */
function fakeEditor() {
  const handlers = new Map<string, () => void>();
  const state = { line: '', ch: 0 };
  const cm = {
    on: (name: string, fn: () => void) => handlers.set(name, fn),
    off: (name: string) => handlers.delete(name),
    getCursor: () => ({ line: 0, ch: state.ch }),
    getLine: () => state.line,
    cursorCoords: () => ({ left: 10, bottom: 20 }),
    addKeyMap: vi.fn(),
    removeKeyMap: vi.fn(),
    replaceRange: vi.fn(),
    focus: vi.fn(),
  };
  const type = (text: string) => {
    state.line = text;
    state.ch = text.length;
    handlers.get('cursorActivity')?.();
  };
  return { cm: cm as unknown as Editor, type };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ComposerAutocomplete search ordering', () => {
  it('ignores a slow older search that resolves after a newer one', async () => {
    const slow = deferred<{ accounts: mastodon.v1.Account[]; hashtags: [] }>();
    search
      .mockImplementationOnce(() => slow.promise)
      .mockResolvedValueOnce({ accounts: [account('alice@new.example')], hashtags: [] });

    const { cm, type } = fakeEditor();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ComposerAutocomplete cm={cm} />
      </QueryClientProvider>,
    );

    // First token fires a search that stays pending.
    act(() => type('@a'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(search).toHaveBeenCalledTimes(1);

    // The user keeps typing; the second search resolves immediately.
    act(() => type('@al'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getByText('@alice@new.example')).toBeInTheDocument();

    // The stale first search now resolves with different results.
    await act(async () => {
      slow.resolve({ accounts: [account('stale@old.example')], hashtags: [] });
      await Promise.resolve();
    });
    expect(screen.queryByText('@stale@old.example')).toBeNull();
    expect(screen.getByText('@alice@new.example')).toBeInTheDocument();
  });
});
