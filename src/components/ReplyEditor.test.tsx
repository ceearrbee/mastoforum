import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import ReplyEditor from './ReplyEditor';
import { SettingsProvider } from '../context/SettingsContext';

vi.mock('./ComposerEditor', () => ({
  default: ({ value }: { value: string }) => <textarea aria-label="editor" value={value} readOnly />,
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: {} as mastodon.rest.Client, credentials: { url: 'https://h.example', token: 't' } }),
}));

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

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('masto_settings', JSON.stringify({ defaultVisibility: 'public' }));
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
