import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountInfoPopover from './AccountInfoPopover';
import { AuthProvider } from '../context/AuthContext';

const account = {
  acct: 'ada',
  displayName: 'Ada Lovelace',
  username: 'ada',
  avatar: '',
  note: '<p>Computing pioneer.</p>',
  followersCount: 100,
  followingCount: 20,
  statusesCount: 500,
  url: 'https://example.social/@ada',
};

function renderWith(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AccountInfoPopover', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts closed', () => {
    renderWith(<AccountInfoPopover account={account} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on trigger click and renders the account fields', () => {
    renderWith(<AccountInfoPopover account={account} />);
    fireEvent.click(screen.getByRole('button'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderWith(<AccountInfoPopover account={account} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on outside click', () => {
    renderWith(
      <div>
        <AccountInfoPopover account={account} />
        <button type="button" data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ada Lovelace/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders @user@server when credentials provide a server and acct is local', () => {
    localStorage.setItem('masto_instance', 'https://example.social');
    localStorage.setItem('masto_access_token', 'token');
    renderWith(<AccountInfoPopover account={account} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('@ada@example.social')).toBeInTheDocument();
  });

  it('renders raw @acct for remote accounts', () => {
    localStorage.setItem('masto_instance', 'https://example.social');
    localStorage.setItem('masto_access_token', 'token');
    renderWith(<AccountInfoPopover account={{ ...account, acct: 'bob@elsewhere.social' }} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('@bob@elsewhere.social')).toBeInTheDocument();
  });

  it('links to the home-instance profile URL', () => {
    renderWith(<AccountInfoPopover account={account} />);
    fireEvent.click(screen.getByRole('button'));
    const link = screen.getByRole('link', { name: /View full profile/i }) as HTMLAnchorElement;
    expect(link.href).toBe('https://example.social/@ada');
    expect(link.target).toBe('_blank');
  });
});
