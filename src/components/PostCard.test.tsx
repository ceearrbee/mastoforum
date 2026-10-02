import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import PostCard from './PostCard';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';

function post(overrides: Partial<mastodon.v1.Status> = {}): mastodon.v1.Status {
  return {
    id: 'p1',
    content: '<p>The whole body.</p>',
    spoilerText: '',
    createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
    editedAt: null,
    favouritesCount: 0,
    reblogsCount: 0,
    repliesCount: 0,
    mediaAttachments: [],
    emojis: [],
    account: { id: 'a1', acct: 'ada@social', displayName: 'Ada', username: 'ada', avatar: '' },
    ...overrides,
  } as unknown as mastodon.v1.Status;
}

function renderCard(p = post()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <PostCard post={p} index={0} onAction={vi.fn()} />
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('PostCard collapsing', () => {

  it('renders expanded by default', () => {
    const { container } = renderCard();
    expect(container.querySelector('.post-content')).toHaveTextContent('The whole body.');
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
  });

  it('hides the body and actions when collapsed, and restores them', () => {
    const { container } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /collapse post/i }));
    expect(container.querySelector('.post-content')).toBeNull();
    expect(screen.queryByRole('button', { name: /like/i })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /expand post/i })[0]);
    expect(container.querySelector('.post-content')).toHaveTextContent('The whole body.');
  });

  it('shows a text teaser while collapsed', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /collapse post/i }));
    expect(screen.getByText('The whole body.')).toBeInTheDocument();
  });

  it('notes hidden attachments while collapsed', () => {
    renderCard(
      post({
        mediaAttachments: [
          { id: 'm1', type: 'image', url: 'https://example.com/a.png' },
          { id: 'm2', type: 'image', url: 'https://example.com/b.png' },
        ] as unknown as mastodon.v1.MediaAttachment[],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /collapse post/i }));
    expect(screen.getByText('2 attachments')).toBeInTheDocument();
  });

  it('remembers the collapsed state across remounts', () => {
    const first = renderCard();
    fireEvent.click(screen.getByRole('button', { name: /collapse post/i }));
    first.unmount();

    const second = renderCard();
    expect(second.container.querySelector('.post-content')).toBeNull();
  });
});

describe('PostCard protocol features', () => {
  it('renders a secret whisper badge for direct visibility statuses', () => {
    renderCard(post({ visibility: 'direct' as mastodon.v1.StatusVisibility }));
    expect(screen.getByText(/whisper/i)).toBeInTheDocument();
  });

  it('renders a warning tag when a status with dice rolls was edited', () => {
    renderCard(
      post({
        content: '<p>I roll for attack: 🎲 d20 ⇒ [20] = 20</p>',
        editedAt: new Date('2026-05-01T01:00:00Z').toISOString(),
      }),
    );
    expect(screen.getByRole('button', { name: /roll edited/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edited$/i })).toBeNull();
  });

  it('renders normal edited tag for non-roll edits', () => {
    renderCard(
      post({
        content: '<p>Just fixing a typo</p>',
        editedAt: new Date('2026-05-01T01:00:00Z').toISOString(),
      }),
    );
    expect(screen.getByRole('button', { name: /^edited$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /roll edited/i })).toBeNull();
  });

  it('renders native quote posts when post.quote is populated', () => {
    renderCard(
      post({
        quote: {
          state: 'accepted',
          quotedStatus: post({
            id: 'q1',
            content: '<p>Quoted lore details</p>',
            account: {
              id: 'a2',
              acct: 'bob@tavern',
              displayName: 'Bob',
              username: 'bob',
              avatar: '',
            } as mastodon.v1.Account,
          }),
        } as unknown as mastodon.v1.Quote,
      }),
    );
    expect(screen.getByText(/quoting/i)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
