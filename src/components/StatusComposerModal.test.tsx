import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import StatusComposerModal from './StatusComposerModal';
import { SettingsProvider } from '../context/SettingsContext';

// The real editor lazy-loads EasyMDE; a textarea is enough to read the seeded value.
vi.mock('./ComposerEditor', () => ({
  default: ({ value }: { value: string }) => (
    <textarea aria-label="editor" value={value} readOnly />
  ),
}));

const sourceFetch = vi.fn();
const selectStatus = vi.fn((id: string) => {
  void id;
  return { source: { fetch: sourceFetch } };
});
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    client: { v1: { statuses: { $select: selectStatus } } },
    credentials: { url: 'https://home.example', token: 't' },
  }),
}));

function status(overrides: Partial<mastodon.v1.Status> = {}): mastodon.v1.Status {
  return {
    id: '42',
    content: '<p>Tom &amp; Jerry</p><p>second</p>',
    text: null,
    spoilerText: '',
    visibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    editedAt: null,
    ...overrides,
  } as unknown as mastodon.v1.Status;
}

function renderModal(s: mastodon.v1.Status) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsProvider>
        <StatusComposerModal open onClose={() => {}} mode={{ kind: 'edit', status: s }} />
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sourceFetch.mockReset();
  selectStatus.mockClear();
});

describe('StatusComposerModal edit mode', () => {
  it('seeds the editor from the fetched source, not the null Status.text', async () => {
    sourceFetch.mockResolvedValue({ id: '42', text: 'Tom & *Jerry*', spoilerText: 'cw' });
    renderModal(status());
    await waitFor(() => expect(screen.getByLabelText('editor')).toHaveValue('Tom & *Jerry*'));
    expect(selectStatus).toHaveBeenCalledWith('42');
    expect(screen.getByLabelText(/Subject/i)).toHaveValue('cw');
  });

  it('shows a loading state, hides the editor and blocks saving until the source arrives', async () => {
    let resolve!: (v: unknown) => void;
    sourceFetch.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderModal(status());
    expect(screen.getByText(/Loading post/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('editor')).toBeNull();
    expect(screen.getByRole('button', { name: /Save changes/i })).toBeDisabled();
    resolve({ id: '42', text: 'loaded', spoilerText: '' });
    await waitFor(() => expect(screen.getByLabelText('editor')).toHaveValue('loaded'));
    expect(screen.getByRole('button', { name: /Save changes/i })).toBeEnabled();
  });

  it('falls back to the stripped post content when the source fetch fails', async () => {
    sourceFetch.mockRejectedValue(new Error('boom'));
    renderModal(status({ spoilerText: 'warn' }));
    await waitFor(() => expect(screen.getByLabelText('editor')).toHaveValue('Tom & Jerry\n\nsecond'));
    expect(screen.getByLabelText(/Subject/i)).toHaveValue('warn');
  });
});
