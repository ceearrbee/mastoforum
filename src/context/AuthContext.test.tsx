import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { notifyUnauthorized } from '../utils/apiErrors';

function Probe() {
  const { credentials, switchAccount } = useAuth();
  return (
    <div>
      <span data-testid="active">{credentials?.url ?? 'none'}</span>
      <button type="button" onClick={() => switchAccount('https://b.social')}>
        switch-b
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('AuthProvider 401 handling', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({
        'https://a.social': { url: 'https://a.social', token: 'tok-a', clientId: 'ca' },
        'https://b.social': { url: 'https://b.social', token: 'tok-b', clientId: 'cb' },
      }),
    );
    localStorage.setItem('mastoforum_active_instance', 'https://a.social');
    fetchMock = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('logs out the active account when its own token gets a 401', async () => {
    renderProvider();
    expect(screen.getByTestId('active')).toHaveTextContent('https://a.social');
    act(() => notifyUnauthorized('tok-a'));
    await flush();
    expect(screen.getByTestId('active')).toHaveTextContent('https://b.social');
  });

  it('ignores a 401 for a token that is not the active one', async () => {
    renderProvider();
    act(() => notifyUnauthorized('tok-b'));
    await flush();
    expect(screen.getByTestId('active')).toHaveTextContent('https://a.social');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores a late 401 from the previous account after a switch', async () => {
    renderProvider();
    act(() => screen.getByText('switch-b').click());
    expect(screen.getByTestId('active')).toHaveTextContent('https://b.social');
    act(() => notifyUnauthorized('tok-a'));
    await flush();
    expect(screen.getByTestId('active')).toHaveTextContent('https://b.social');
  });

  it('runs one logout for concurrent 401s on the same token', async () => {
    // Two accounts: a double logout would also drop b and leave nobody signed in.
    renderProvider();
    act(() => {
      notifyUnauthorized('tok-a');
      notifyUnauthorized('tok-a');
      notifyUnauthorized('tok-a');
    });
    await flush();
    expect(screen.getByTestId('active')).toHaveTextContent('https://b.social');
    const revokes = fetchMock.mock.calls.filter(([url]) => String(url).includes('/oauth/revoke'));
    expect(revokes).toHaveLength(1);
  });

  it('follows an active-account change made in another tab', async () => {
    renderProvider();
    localStorage.setItem('mastoforum_active_instance', 'https://b.social');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'mastoforum_active_instance' }));
    });
    await flush();
    expect(screen.getByTestId('active')).toHaveTextContent('https://b.social');
  });
});
