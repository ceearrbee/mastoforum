import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import ReplyEditor from './ReplyEditor';
import { SettingsProvider } from '../context/SettingsContext';

vi.mock('./ComposerEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const api = vi.hoisted(() => ({
  mediaCreate: vi.fn(),
  mediaUpdate: vi.fn(),
  statusCreate: vi.fn(),
}));
vi.mock('../context/AuthContext', () => {
  const client = {
    v1: {
      media: { $select: () => ({ update: api.mediaUpdate }) },
      statuses: { create: api.statusCreate },
    },
    v2: { media: { create: api.mediaCreate } },
  };
  return { useAuth: () => ({ client, credentials: { url: 'https://h.example', token: 't' } }) };
});

type Props = Parameters<typeof ReplyEditor>[0];

function replyEditor(props: Partial<Props>) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SettingsProvider>
        <ReplyEditor threadId="T" {...props} />
      </SettingsProvider>
    </QueryClientProvider>
  );
}

function target(visibility: mastodon.v1.StatusVisibility): mastodon.v1.Status {
  return {
    id: 'R',
    content: '<p>hi</p>',
    visibility,
    account: { id: 'a', acct: 'ada', username: 'ada', displayName: 'Ada' },
  } as unknown as mastodon.v1.Status;
}

const visibilitySelect = () => screen.getByLabelText('Visibility') as HTMLSelectElement;

let blobCount = 0;
const createObjectURL = vi.fn(() => `blob:preview-${++blobCount}`);
const revokeObjectURL = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('masto_settings', JSON.stringify({ defaultVisibility: 'public' }));
  vi.clearAllMocks();
  blobCount = 0;
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  api.mediaCreate.mockResolvedValue({ id: 'M1' });
  api.mediaUpdate.mockResolvedValue({});
  api.statusCreate.mockResolvedValue({ id: 'S1' });
});

describe('ReplyEditor reply visibility', () => {
  it('starts as public when the thread root is public', () => {
    render(replyEditor({ rootVisibility: 'public' }));
    expect(visibilitySelect().value).toBe('public');
  });

  it('is clamped up to the thread root visibility instead of the public default', () => {
    render(replyEditor({ rootVisibility: 'private' }));
    expect(visibilitySelect().value).toBe('private');
  });

  it('is clamped up when the root loads after the editor mounted', () => {
    const { rerender } = render(replyEditor({}));
    expect(visibilitySelect().value).toBe('public');
    rerender(replyEditor({ rootVisibility: 'direct' }));
    expect(visibilitySelect().value).toBe('direct');
  });

  it('is clamped up to the visibility of the post being replied to', () => {
    const { rerender } = render(replyEditor({ rootVisibility: 'public' }));
    rerender(replyEditor({ rootVisibility: 'public', replyTo: target('private') }));
    expect(visibilitySelect().value).toBe('private');
  });
});

describe('ReplyEditor attachments', () => {
  async function attachPhoto(container: HTMLElement, alt: string) {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(await screen.findByLabelText('Alt text'), { target: { value: alt } });
  }

  it('does not post, and names the file, when saving its alt text fails', async () => {
    api.mediaUpdate.mockRejectedValue(new Error('boom'));
    const { container } = render(replyEditor({}));
    await attachPhoto(container, 'A cat');
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'hello' } });

    fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

    expect(await screen.findByText(/alt text for photo\.png/i)).toBeInTheDocument();
    expect(api.statusCreate).not.toHaveBeenCalled();
  });

  it('posts once the alt text saves', async () => {
    const { container } = render(replyEditor({}));
    await attachPhoto(container, 'A cat');

    fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

    await waitFor(() => expect(api.statusCreate).toHaveBeenCalled());
    expect(api.mediaUpdate).toHaveBeenCalledWith({ description: 'A cat' });
    expect(api.statusCreate.mock.calls[0][0]).toMatchObject({ mediaIds: ['M1'] });
  });

  it('revokes the preview URL when the attachment is removed', async () => {
    const { container } = render(replyEditor({}));
    await attachPhoto(container, '');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });

  it('revokes remaining preview URLs when the editor unmounts', async () => {
    const { container, unmount } = render(replyEditor({}));
    await attachPhoto(container, '');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });
});

describe('ReplyEditor post params', () => {
  it('does not send the unsupported allowedMentions field', async () => {
    render(replyEditor({ replyTo: target('public') }));
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'hi there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

    await waitFor(() => expect(api.statusCreate).toHaveBeenCalled());
    const params = api.statusCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(params).toMatchObject({ inReplyToId: 'R' });
    expect(params).not.toHaveProperty('allowedMentions');
  });
});
