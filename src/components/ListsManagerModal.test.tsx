import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { mastodon } from 'masto';
import ListsManagerModal from './ListsManagerModal';

const api = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  membersList: vi.fn(),
  membersCreate: vi.fn(),
  search: vi.fn(),
}));

vi.mock('../context/AuthContext', () => {
  const selected = {
    update: api.update,
    remove: api.remove,
    accounts: { list: api.membersList, create: api.membersCreate, remove: vi.fn() },
  };
  const client = {
    v1: {
      lists: {
        list: async () => [{ id: 'L1', title: 'Friends' }],
        create: vi.fn(),
        $select: () => selected,
      },
    },
    v2: { search: { list: api.search } },
  };
  return { useAuth: () => ({ client, credentials: { url: 'https://x.example', token: 't' } }) };
});

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function setup(route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Where />
        <ListsManagerModal open onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.update.mockResolvedValue({});
  api.remove.mockResolvedValue({});
  api.membersList.mockResolvedValue([]);
  api.membersCreate.mockResolvedValue({});
  api.search.mockResolvedValue({
    accounts: [{ id: 'A1', acct: 'bob@x.example', displayName: 'Bob', avatar: '', emojis: [] }],
  } as unknown as mastodon.v2.Search);
});

const invalidatedKeys = (spy: ReturnType<typeof setup>['invalidate']) =>
  spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));

describe('ListsManagerModal cache and route sync', () => {
  it('refreshes the cached list (page title) after a rename', async () => {
    const { invalidate } = setup('/list/L1');
    fireEvent.click(await screen.findByRole('button', { name: 'Rename list' }));
    fireEvent.change(screen.getByLabelText('Rename Friends'), { target: { value: 'Pals' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ title: 'Pals' }));
    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('["list","L1"]'));
  });

  it('refreshes the list timeline after a member is added', async () => {
    const { invalidate } = setup('/list/L1');
    fireEvent.click(await screen.findByRole('button', { name: 'Friends' }));
    fireEvent.change(await screen.findByLabelText('Add a member'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));

    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('["listTimeline","L1"]'));
  });

  async function deleteList() {
    fireEvent.click(await screen.findByRole('button', { name: 'Delete list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalled());
  }

  it('navigates home when the deleted list is the open page', async () => {
    setup('/list/L1');
    await deleteList();
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/));
  });

  it('stays on the current page when a different list is open', async () => {
    const { invalidate } = setup('/list/OTHER');
    await deleteList();
    // The lists refresh runs after the navigate decision in onSuccess.
    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('["lists"]'));
    expect(screen.getByTestId('path')).toHaveTextContent('/list/OTHER');
  });
});
