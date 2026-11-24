import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import MutedAccounts from './MutedAccounts';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  unmute: vi.fn(),
  signedIn: true,
}));

vi.mock('../context/AuthContext', () => {
  const client = {
    v1: {
      mutes: { list: { $raw: api.list } },
      accounts: { $select: () => ({ unmute: api.unmute }) },
    },
  };
  return {
    useAuth: () =>
      api.signedIn
        ? { client, credentials: { url: 'https://home.example', token: 't' } }
        : { client: undefined, credentials: null },
  };
});

const account = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    acct: `${id}@elsewhere.social`,
    username: id,
    displayName: id.toUpperCase(),
    avatar: '',
    emojis: [],
    ...extra,
  }) as unknown as mastodon.v1.Account;

const page = (data: mastodon.v1.Account[], link?: string) => ({
  data,
  headers: new Headers(link ? { link } : {}),
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MutedAccounts />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, qc };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.signedIn = true;
  api.unmute.mockResolvedValue({});
});

describe('MutedAccounts page', () => {
  it('renders one h1 and a sign-in prompt when signed out', () => {
    api.signedIn = false;
    const { container } = renderPage();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByText('Sign in to manage muted accounts.')).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('lists muted accounts with name, handle and expiry when one is set', async () => {
    const expires = '2026-12-01T12:00:00.000Z';
    api.list.mockResolvedValue(
      page([account('ann', { muteExpiresAt: expires }), account('bob', { muteExpiresAt: null })]),
    );
    const { container } = renderPage();

    expect(await screen.findByText('ANN')).toBeInTheDocument();
    expect(screen.getByText('@ann@elsewhere.social')).toBeInTheDocument();
    expect(screen.getByText('BOB')).toBeInTheDocument();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getAllByText(/Muted until/)).toHaveLength(1);
    expect(container.querySelector(`time[datetime="${expires}"]`)).not.toBeNull();
    expect(screen.getAllByRole('button', { name: /^Unmute/ })).toHaveLength(2);
  });

  it('shows an empty message when nothing is muted', async () => {
    api.list.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('You have not muted anyone.')).toBeInTheDocument();
  });

  it('unmutes an account and refreshes the list', async () => {
    api.list
      .mockResolvedValueOnce(page([account('ann'), account('bob')]))
      .mockResolvedValue(page([account('bob')]));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Unmute @ann@elsewhere.social' }));

    await waitFor(() => expect(api.unmute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('ANN')).toBeNull());
    expect(screen.getByText('BOB')).toBeInTheDocument();
  });

  it('pages with the max_id from the Link header, not the last account id', async () => {
    api.list
      .mockResolvedValueOnce(
        page(
          [account('ann')],
          '<https://home.example/api/v1/mutes?limit=30&max_id=555>; rel="next"',
        ),
      )
      .mockResolvedValueOnce(page([account('bob')]));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('BOB')).toBeInTheDocument();
    expect(api.list).toHaveBeenNthCalledWith(1, { limit: 40 });
    expect(api.list).toHaveBeenNthCalledWith(2, { limit: 40, maxId: '555' });
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });
});
