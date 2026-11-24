import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import PostCard from './PostCard';
import { SettingsProvider } from '../context/SettingsContext';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: { v1: {} }, credentials }),
}));

const post = (accountId: string, acct: string, extra: Partial<mastodon.v1.Status> = {}) =>
  ({
    id: 'p1',
    content: '<p>Body.</p>',
    spoilerText: '',
    createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
    editedAt: null,
    favouritesCount: 0,
    reblogsCount: 0,
    repliesCount: 0,
    mediaAttachments: [],
    emojis: [],
    reblog: null,
    account: { id: accountId, acct, displayName: acct, username: acct, avatar: '' },
    ...extra,
  }) as unknown as mastodon.v1.Status;

function renderCard(p: mastodon.v1.Status, ownAccountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['verifyCredentials', credentials.url], { id: 'me' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SettingsProvider>
          <PostCard
            post={p}
            index={0}
            ownAccountId={ownAccountId}
            onAction={vi.fn()}
            onEditClick={vi.fn()}
            onDeleteClick={vi.fn()}
          />
        </SettingsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const menuItem = (text: string) => screen.getByText(text, { selector: '[role="menuitem"] *' });

beforeEach(() => localStorage.clear());

describe('PostCard mute action', () => {
  it("offers Mute on someone else's post", () => {
    renderCard(post('acc1', 'bob@elsewhere.social'), 'me');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for @bob@elsewhere.social' }));
    expect(menuItem('Mute @bob@elsewhere.social')).toBeInTheDocument();
  });

  it('mutes the original author of a boost, not the booster', () => {
    const boost = post('booster', 'carol@x.social', {
      reblog: post('acc1', 'bob@elsewhere.social') as never,
    });
    renderCard(boost, 'me');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for @bob@elsewhere.social' }));
    expect(menuItem('Mute @bob@elsewhere.social')).toBeInTheDocument();
  });

  it('shows Edit and Delete but no Mute on your own post', () => {
    renderCard(post('me', 'me@home.example'), 'me');
    fireEvent.click(screen.getByRole('button', { name: 'Post actions' }));
    expect(menuItem('Edit')).toBeInTheDocument();
    expect(screen.queryByText(/^Mute @/)).toBeNull();
  });

  it('hides Mute on your own post even when ownAccountId is not passed', () => {
    renderCard(post('me', 'me@home.example'));
    expect(screen.queryByRole('button', { name: 'Post actions' })).toBeNull();
  });
});
