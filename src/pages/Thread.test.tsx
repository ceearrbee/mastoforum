import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { mastodon } from 'masto';
import Thread from './Thread';
import { SettingsProvider } from '../context/SettingsContext';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: {} as mastodon.rest.Client, credentials }),
}));

function st(id: string, inReplyToId: string | null, createdAt: string): mastodon.v1.Status {
  return {
    id,
    inReplyToId,
    createdAt,
    editedAt: null,
    content: `<p>Body of ${id}.</p>`,
    spoilerText: '',
    favouritesCount: 0,
    reblogsCount: 0,
    repliesCount: 0,
    mediaAttachments: [],
    emojis: [],
    tags: [],
    account: { id: 'a1', acct: 'ada@social', displayName: 'Ada', username: 'ada', avatar: '' },
  } as unknown as mastodon.v1.Status;
}

// M ── C1 ── GC1
//   └─ C2
const mainPost = st('M', null, '2025-01-01T00:00:00Z');
const descendants = [
  st('C1', 'M', '2025-01-02T00:00:00Z'),
  st('GC1', 'C1', '2025-01-02T01:00:00Z'),
  st('C2', 'M', '2025-01-03T00:00:00Z'),
];

vi.mock('../hooks/api', () => ({
  useCurrentUser: () => ({ data: { id: 'me' } }),
  useThread: () => ({
    threadData: { ancestors: [], mainPost, descendants },
    isLoading: false,
    error: null,
    actionError: null,
    setActionError: vi.fn(),
    handleAction: vi.fn(),
    muteMutation: { mutate: vi.fn(), isPending: false },
    deleteMutation: { mutate: vi.fn() },
    syncRemoteMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

function renderThread(view: 'flat' | 'tree' = 'tree') {
  localStorage.setItem('masto_settings', JSON.stringify({ threadView: view }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/thread/M']}>
        <SettingsProvider>
          <Routes>
            <Route path="/thread/:id" element={<Thread />} />
          </Routes>
        </SettingsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Ids of the post cards currently rendered, in order. */
function renderedPostIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll('article[id^="post-"]')].map((el) =>
    el.id.replace('post-', ''),
  );
}

function collapseToggleFor(container: HTMLElement, postId: string): HTMLElement {
  const card = container.querySelector(`#post-${postId}`) as HTMLElement;
  return within(card).getByRole('button', { name: /collapse post|expand post/i });
}

describe('Thread collapsing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('folds a collapsed post’s whole subtree away in tree view', () => {
    const { container } = renderThread('tree');
    expect(renderedPostIds(container)).toEqual(['M', 'C1', 'GC1', 'C2']);

    fireEvent.click(collapseToggleFor(container, 'C1'));
    expect(renderedPostIds(container)).toEqual(['M', 'C1', 'C2']);
    expect(screen.getByText('1 reply')).toBeInTheDocument();

    fireEvent.click(collapseToggleFor(container, 'C1'));
    expect(renderedPostIds(container)).toEqual(['M', 'C1', 'GC1', 'C2']);
  });

  it('keeps post numbers stable when a subtree is folded', () => {
    const { container } = renderThread('tree');
    fireEvent.click(collapseToggleFor(container, 'C1'));
    const c2 = container.querySelector('#post-C2') as HTMLElement;
    expect(within(c2).getByText('#4')).toBeInTheDocument();
  });

  it('leaves siblings visible in flat view, since there is no subtree there', () => {
    const { container } = renderThread('flat');
    fireEvent.click(collapseToggleFor(container, 'C1'));
    expect(renderedPostIds(container)).toEqual(['M', 'C1', 'GC1', 'C2']);
  });

  it('collapses and expands every post from the toolbar', () => {
    const { container } = renderThread('flat');
    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(container.querySelectorAll('.post-content')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(container.querySelectorAll('.post-content')).toHaveLength(4);
  });

  it('toggles the focused post with the "c" shortcut', () => {
    const { container } = renderThread('flat');
    (container.querySelector('#post-C1') as HTMLElement).focus();

    fireEvent.keyDown(document, { key: 'c' });
    expect(container.querySelector('#post-C1 .post-content')).toBeNull();
    expect(container.querySelector('#post-M .post-content')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'c' });
    expect(container.querySelector('#post-C1 .post-content')).not.toBeNull();
  });

  it('ignores "c" when no post has focus', () => {
    const { container } = renderThread('flat');
    fireEvent.keyDown(document, { key: 'c' });
    expect(container.querySelectorAll('.post-content')).toHaveLength(4);
  });

  it('toggles every post with the "C" shortcut', () => {
    const { container } = renderThread('flat');
    fireEvent.keyDown(document, { key: 'C' });
    expect(container.querySelectorAll('.post-content')).toHaveLength(0);

    fireEvent.keyDown(document, { key: 'C' });
    expect(container.querySelectorAll('.post-content')).toHaveLength(4);
  });
});
