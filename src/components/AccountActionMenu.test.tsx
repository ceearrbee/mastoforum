import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import AccountActionMenu from './AccountActionMenu';

const credentials = { url: 'https://home.example', token: 't' };

const api = vi.hoisted(() => ({
  mute: vi.fn(),
  unmute: vi.fn(),
  block: vi.fn(),
  unblock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => {
  const client = { v1: { accounts: { $select: () => api } } };
  return { useAuth: () => ({ client, credentials }) };
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({});
});

function renderWith(rel: Partial<mastodon.v1.Relationship> | null, selfId = 'me') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['verifyCredentials', credentials.url], { id: selfId });
  qc.setQueryData(['relationship', 'acc1'], rel);
  const view = render(
    <QueryClientProvider client={qc}>
      <AccountActionMenu account={{ id: 'acc1', acct: 'bob@elsewhere.social' }} />
    </QueryClientProvider>,
  );
  return { ...view, qc };
}

const status = (id: string, accountId: string) =>
  ({ id, account: { id: accountId }, reblog: null }) as unknown as mastodon.v1.Status;

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Account actions' }));
}

// jsdom leaves the floating menu `visibility: hidden`, so role/name queries skip it.
const dialogOpen = () => document.querySelector('.cds--modal.is-visible') !== null;
const menuItem = (text: string) =>
  screen.getByText(text, { selector: '[role="menuitem"] *' });

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

  it('opens the mute options dialog instead of muting at once', () => {
    renderWith({ following: false, muting: false });
    expect(dialogOpen()).toBe(false);
    openMenu();
    fireEvent.click(menuItem('Mute'));
    expect(dialogOpen()).toBe(true);
    expect(screen.getByText('Mute @bob@elsewhere.social')).toBeInTheDocument();
    expect(api.mute).not.toHaveBeenCalled();
  });

  it('mutes with the chosen duration and notification choice', async () => {
    renderWith({ following: false, muting: false });
    openMenu();
    fireEvent.click(menuItem('Mute'));
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '86400' } });
    fireEvent.click(screen.getByLabelText('Hide notifications from this account'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    await waitFor(() => expect(api.mute).toHaveBeenCalledWith({ duration: 86400, notifications: false }));
  });

  it('mutes indefinitely with notifications hidden by default', async () => {
    renderWith({ following: false, muting: false });
    openMenu();
    fireEvent.click(menuItem('Mute'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    await waitFor(() => expect(api.mute).toHaveBeenCalledWith({ duration: 0, notifications: true }));
  });

  it('unmutes in one click, with no dialog', async () => {
    renderWith({ following: false, muting: true });
    openMenu();
    fireEvent.click(menuItem('Unmute'));
    await waitFor(() => expect(api.unmute).toHaveBeenCalledTimes(1));
    expect(dialogOpen()).toBe(false);
  });

  it('removes the muted account from cached timelines and refreshes the mute list', async () => {
    const { qc } = renderWith({ following: false, muting: false });
    qc.setQueryData(['feed', 'home'], {
      pages: [{ topics: [status('1', 'acc1'), status('2', 'other')], lastId: '2' }],
      pageParams: [undefined],
    });
    qc.setQueryData(['mutes'], { pages: [[]], pageParams: [undefined] });
    openMenu();
    fireEvent.click(menuItem('Mute'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

    await waitFor(() => {
      const feed = qc.getQueryData<{ pages: { topics: mastodon.v1.Status[] }[] }>(['feed', 'home']);
      expect(feed?.pages[0].topics.map((s) => s.id)).toEqual(['2']);
    });
    expect(qc.getQueryState(['mutes'])?.isInvalidated).toBe(true);
  });

  it('removes a blocked account from cached timelines', async () => {
    const { qc } = renderWith({ following: false, blocking: false });
    qc.setQueryData(['listTimeline', 'L1'], {
      pages: [[status('1', 'acc1'), status('2', 'other')]],
      pageParams: [undefined],
    });
    openMenu();
    fireEvent.click(menuItem('Block'));

    await waitFor(() => expect(api.block).toHaveBeenCalled());
    await waitFor(() => {
      const list = qc.getQueryData<{ pages: mastodon.v1.Status[][] }>(['listTimeline', 'L1']);
      expect(list?.pages[0].map((s) => s.id)).toEqual(['2']);
    });
  });

  it('leaves timelines alone when the mute request fails', async () => {
    api.mute.mockRejectedValue(new Error('nope'));
    const { qc } = renderWith({ following: false, muting: false });
    const list = { pages: [[status('1', 'acc1')]], pageParams: [undefined] };
    qc.setQueryData(['listTimeline', 'L1'], list);
    openMenu();
    fireEvent.click(menuItem('Mute'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
    expect(qc.getQueryData(['listTimeline', 'L1'])).toBe(list);
  });
});
