import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import AccountActionMenu from './AccountActionMenu';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: {} as mastodon.rest.Client, credentials }),
}));

function renderWith(rel: Partial<mastodon.v1.Relationship> | null, selfId = 'me') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['verifyCredentials', credentials.url], { id: selfId });
  qc.setQueryData(['relationship', 'acc1'], rel);
  return render(
    <QueryClientProvider client={qc}>
      <AccountActionMenu account={{ id: 'acc1', acct: 'bob@elsewhere.social' }} />
    </QueryClientProvider>,
  );
}

describe('AccountActionMenu', () => {
  it('shows Follow when not following', () => {
    renderWith({ following: false, requested: false });
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  });

  it('shows Following when already following', () => {
    renderWith({ following: true });
    expect(screen.getByRole('button', { name: 'Following' })).toBeInTheDocument();
  });

  it('shows Requested while a follow request is pending', () => {
    renderWith({ following: false, requested: true });
    expect(screen.getByRole('button', { name: 'Requested' })).toBeInTheDocument();
  });

  it('renders nothing for your own account', () => {
    const { container } = renderWith({ following: false }, 'acc1');
    expect(container).toBeEmptyDOMElement();
  });
});
