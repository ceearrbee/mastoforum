import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import PostAccountMenu from './PostAccountMenu';

const credentials = { url: 'https://home.example', token: 't' };

const api = vi.hoisted(() => ({ mute: vi.fn(), signedIn: true }));

vi.mock('../context/AuthContext', () => {
  const client = { v1: { accounts: { $select: () => ({ mute: api.mute }) } } };
  return {
    useAuth: () =>
      api.signedIn ? { client, credentials } : { client: undefined, credentials: null },
  };
});

const author = { id: 'acc1', acct: 'bob@elsewhere.social' };

const status = (id: string, accountId: string) =>
  ({ id, account: { id: accountId }, reblog: null }) as unknown as mastodon.v1.Status;

function renderMenu(selfId: string | null = 'me') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (selfId) qc.setQueryData(['verifyCredentials', credentials.url], { id: selfId });
  const view = render(
    <QueryClientProvider client={qc}>
      <PostAccountMenu account={author} />
    </QueryClientProvider>,
  );
  return { ...view, qc };
}

const dialogOpen = () => document.querySelector('.cds--modal.is-visible') !== null;
// jsdom leaves the floating menu `visibility: hidden`, so role/name queries skip it.
const menuItem = (text: string) => screen.getByText(text, { selector: '[role="menuitem"] *' });

beforeEach(() => {
  vi.clearAllMocks();
  api.signedIn = true;
  api.mute.mockResolvedValue({});
});

describe('PostAccountMenu', () => {
  it('offers "Mute @acct" for another account', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for @bob@elsewhere.social' }));
    expect(menuItem('Mute @bob@elsewhere.social')).toBeInTheDocument();
  });

  it('renders nothing for your own account', () => {
    const { container } = renderMenu('acc1');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while your own account is still loading', () => {
    const { container } = renderMenu(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when signed out', () => {
    api.signedIn = false;
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the mute dialog, mutes with the chosen options and purges cached posts', async () => {
    const { qc } = renderMenu();
    qc.setQueryData(['feed', 'home'], {
      pages: [{ topics: [status('1', 'acc1'), status('2', 'other')], lastId: '2' }],
      pageParams: [undefined],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Actions for @bob@elsewhere.social' }));
    fireEvent.click(menuItem('Mute @bob@elsewhere.social'));
    expect(dialogOpen()).toBe(true);
    expect(api.mute).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

    await waitFor(() => expect(api.mute).toHaveBeenCalledWith({ duration: 1800, notifications: true }));
    await waitFor(() => {
      const feed = qc.getQueryData<{ pages: { topics: mastodon.v1.Status[] }[] }>(['feed', 'home']);
      expect(feed?.pages[0].topics.map((s) => s.id)).toEqual(['2']);
    });
    expect(dialogOpen()).toBe(false);
  });

  it('keeps the dialog unmounted until the menu item is used', () => {
    renderMenu();
    expect(document.querySelector('.cds--modal')).toBeNull();
  });

  it('returns focus to the menu button when the dialog is cancelled', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Actions for @bob@elsewhere.social' });
    fireEvent.click(trigger);
    fireEvent.click(menuItem('Mute @bob@elsewhere.social'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(trigger).toHaveFocus();
  });
});
