import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { mastodon } from 'masto';
import Profile from './Profile';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: {} as mastodon.rest.Client, credentials }),
}));

function account(overrides: Partial<mastodon.v1.Account> = {}): mastodon.v1.Account {
  return {
    id: 'acc1',
    acct: 'ada@social',
    username: 'ada',
    displayName: 'Ada Lovelace',
    avatar: '',
    note: '',
    emojis: [],
    bot: true,
    locked: true,
    createdAt: '2019-03-08T00:00:00.000Z',
    followersCount: 0,
    followingCount: 0,
    statusesCount: 0,
    fields: [
      {
        name: 'Site',
        value: '<a href="https://example.com">example.com</a>',
        verifiedAt: '2024-01-01T00:00:00Z',
      },
      { name: 'Pronouns', value: 'she/her', verifiedAt: null },
    ],
    ...overrides,
  } as unknown as mastodon.v1.Account;
}

function renderProfile(acc = account(), path = '/@ada@social') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(['account', 'ada@social'], acc);
  qc.setQueryData(['verifyCredentials', credentials.url], { id: 'me' });
  qc.setQueryData(['relationship', 'acc1'], { following: false });
  qc.setQueryData(['accountStatuses', 'acc1'], { pages: [], pageParams: [] });
  qc.setQueryData(['accountPinned', 'acc1'], []);
  qc.setQueryData(['accountFeaturedTags', 'acc1'], []);
  qc.setQueryData(['accountEndorsements', 'acc1'], []);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:acct" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Profile', () => {
  it('renders bot / locked / joined identity badges', () => {
    renderProfile();
    expect(screen.getByText('Bot')).toBeInTheDocument();
    expect(screen.getByText(/Requires follow approval/i)).toBeInTheDocument();
    expect(screen.getByText(/Joined .*2019/)).toBeInTheDocument();
  });

  it('renders profile metadata fields, marking only verified ones', () => {
    const { container } = renderProfile();
    expect(screen.getByText('Site')).toBeInTheDocument();
    expect(screen.getByText('Pronouns')).toBeInTheDocument();
    // One verified field (Site) → exactly one verification mark; Pronouns has none.
    expect(container.querySelectorAll('[aria-label="Verified"]')).toHaveLength(1);
  });

  it('404s a single-segment path that is not an @handle', () => {
    renderProfile(account(), '/notahandle');
    expect(screen.getByText(/doesn't match any route/i)).toBeInTheDocument();
  });
});
