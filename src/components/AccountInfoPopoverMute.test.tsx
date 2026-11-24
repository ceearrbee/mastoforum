import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountInfoPopover from './AccountInfoPopover';

const credentials = { url: 'https://home.example', token: 't' };

vi.mock('../context/AuthContext', () => {
  const client = {
    v1: {
      accounts: {
        relationships: { fetch: async () => [{ following: false, muting: false }] },
        $select: () => ({ mute: vi.fn() }),
      },
    },
  };
  return { useAuth: () => ({ client, credentials }) };
});

const account = {
  id: 'acc1',
  acct: 'ada',
  displayName: 'Ada',
  username: 'ada',
  avatar: '',
  note: '',
  followersCount: 1,
  followingCount: 1,
  statusesCount: 1,
  url: 'https://example.social/@ada',
};

const menuItem = (text: string) => screen.getByText(text, { selector: '[role="menuitem"] *' });
const popover = () => screen.queryByRole('dialog', { name: 'Account information' });

function openMuteDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['verifyCredentials', credentials.url], { id: 'me' });
  qc.setQueryData(['relationship', 'acc1'], { following: false, muting: false });
  render(
    <QueryClientProvider client={qc}>
      <AccountInfoPopover account={account} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Ada/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Account actions' }));
  fireEvent.click(menuItem('Mute'));
}

beforeEach(() => localStorage.clear());

describe('AccountInfoPopover with the mute dialog open', () => {
  it('stays open when Escape is meant for the dialog', () => {
    openMuteDialog();
    expect(document.querySelector('.cds--modal.is-visible')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(popover()).toBeInTheDocument();
  });

  it('stays open when the pointer goes down inside the dialog', () => {
    openMuteDialog();
    fireEvent.mouseDown(screen.getByLabelText('Duration'));
    expect(popover()).toBeInTheDocument();
  });

  it('still closes on Escape when no dialog is open', () => {
    openMuteDialog();
    const dialog = document.querySelector<HTMLElement>('.cds--modal.is-visible')!;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(popover()).toBeNull();
  });
});
