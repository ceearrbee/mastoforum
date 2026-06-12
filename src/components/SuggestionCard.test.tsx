import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import SuggestionCard from './SuggestionCard';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: {} as mastodon.rest.Client, credentials }),
}));

function suggestion(
  overrides: Partial<mastodon.v1.Account> = {},
): mastodon.v1.Suggestion {
  return {
    source: 'global',
    sources: ['friends_of_friends'],
    account: {
      id: 'acc1',
      acct: 'ada@social',
      displayName: 'Ada Lovelace',
      username: 'ada',
      avatar: '',
      note: '<p>First programmer. Loves <b>math</b>.</p>',
      emojis: [],
      ...overrides,
    },
  } as unknown as mastodon.v1.Suggestion;
}

function renderCard(onDismiss = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['verifyCredentials', credentials.url], { id: 'me' });
  qc.setQueryData(['relationship', 'acc1'], { following: false });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SuggestionCard suggestion={suggestion()} onDismiss={onDismiss} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onDismiss;
}

describe('SuggestionCard', () => {
  it('shows the display name and stripped bio', () => {
    renderCard();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    const bio = screen.getByText(/First programmer/);
    expect(bio.textContent).not.toContain('<');
  });

  it('renders a Follow button via the account action menu', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = renderCard();
    screen.getByRole('button', { name: /dismiss/i }).click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
