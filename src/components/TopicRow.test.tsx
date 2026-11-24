import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import TopicRow from './TopicRow';
import { markThreadSeen } from '../utils/readState';

function post(overrides: Partial<mastodon.v1.Status> = {}): mastodon.v1.Status {
  return {
    id: 't1',
    content: '<p>A long enough body to truncate eventually.</p>',
    spoilerText: '',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    repliesCount: 7,
    tags: [
      { name: 'fediverse', url: '' },
      { name: 'forums', url: '' },
    ],
    account: {
      acct: 'ada@social',
      displayName: 'Ada Lovelace',
      username: 'ada',
      avatar: '',
    },
    ...overrides,
  } as unknown as mastodon.v1.Status;
}

describe('TopicRow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('collapses a single expanded row without touching the list default', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow post={post({ content: '<p>The whole body.</p>' })} expanded />
      </MemoryRouter>,
    );
    expect(container.querySelector('.post-content')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /collapse post/i }));
    expect(container.querySelector('.post-content')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /expand post/i }));
    expect(container.querySelector('.post-content')).not.toBeNull();
  });

  it('expands a single collapsed row without touching the list default', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow post={post({ content: '<p>The whole body.</p>' })} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.post-content')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /expand post/i }));
    expect(container.querySelector('.post-content')).toHaveTextContent('The whole body.');
  });

  it('shows only the title preview by default', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow post={post({ spoilerText: 'My topic' })} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.post-content')).toBeNull();
  });

  it('renders the full body when expanded', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow
          post={post({ spoilerText: 'My topic', content: '<p>The whole body.</p>' })}
          expanded
        />
      </MemoryRouter>,
    );
    const body = container.querySelector('.post-content');
    expect(body).not.toBeNull();
    expect(body).toHaveTextContent('The whole body.');
  });

  it('styles tabletop blocks in the expanded body only when asked', () => {
    const dice = '<p>\u{1F3B2} 2d6+3 \u21D2 [4, 5] +3 = 12</p>';
    const plain = render(
      <MemoryRouter>
        <TopicRow post={post({ content: dice })} expanded />
      </MemoryRouter>,
    );
    expect(plain.container.querySelector('.tt-dice')).toBeNull();
    plain.unmount();

    const styled = render(
      <MemoryRouter>
        <TopicRow post={post({ content: dice })} expanded enhanceTabletop />
      </MemoryRouter>,
    );
    expect(styled.container.querySelector('.tt-dice')).not.toBeNull();
  });
  it('uses spoilerText as the title when set', () => {
    render(
      <MemoryRouter>
        <TopicRow post={post({ spoilerText: 'My topic' })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'My topic' })).toBeInTheDocument();
  });

  it('falls back to a stripped, truncated content preview', () => {
    render(
      <MemoryRouter>
        <TopicRow post={post()} />
      </MemoryRouter>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).not.toContain('<');
    expect(heading.textContent?.length).toBeGreaterThan(0);
  });

  it('renders the reply count', () => {
    render(
      <MemoryRouter>
        <TopicRow post={post()} />
      </MemoryRouter>,
    );
    const row = screen.getByRole('article');
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText(/Replies/i)).toBeInTheDocument();
  });

  it('renders tag chips, excluding the active board tag', () => {
    render(
      <MemoryRouter>
        <TopicRow post={post()} hideTag="fediverse" />
      </MemoryRouter>,
    );
    expect(screen.queryByText('#fediverse')).toBeNull();
    expect(screen.getByText('#forums')).toBeInTheDocument();
  });

  it('links to the topic id, URL-encoded', () => {
    render(
      <MemoryRouter>
        <TopicRow post={post({ id: 'has/slash' })} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    // First link is the title link, which carries the thread href.
    expect(links[0].getAttribute('href')).toBe('/thread/has%2Fslash');
  });

  it('renders images when expanded', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow
          post={post({
            content: '<p>A post with a photo.</p>',
            mediaAttachments: [
              {
                id: 'm1',
                type: 'image',
                previewUrl: 'https://img.example/preview.jpg',
                url: 'https://img.example/full.jpg',
                description: 'A beautiful sunset',
              } as mastodon.v1.MediaAttachment,
            ],
          })}
          expanded
        />
      </MemoryRouter>,
    );
    const img = screen.getByRole('img', { name: 'A beautiful sunset' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.example/preview.jpg');
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
    expect(container.querySelector('.post-content')).toHaveTextContent('A post with a photo.');
  });

  it('does not render images when collapsed', () => {
    render(
      <MemoryRouter>
        <TopicRow
          post={post({
            content: '<p>A post with a photo.</p>',
            mediaAttachments: [
              {
                id: 'm1',
                type: 'image',
                previewUrl: 'https://img.example/preview.jpg',
                url: 'https://img.example/full.jpg',
                description: 'A beautiful sunset',
              } as mastodon.v1.MediaAttachment,
            ],
          })}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img', { name: 'A beautiful sunset' })).toBeNull();
  });

  it('allows expanding an image-only post and renders its images', () => {
    const { container } = render(
      <MemoryRouter>
        <TopicRow
          post={post({
            content: '',
            mediaAttachments: [
              {
                id: 'm1',
                type: 'image',
                previewUrl: 'https://img.example/photo.png',
                url: 'https://img.example/photo.png',
                description: 'Photo only',
              } as mastodon.v1.MediaAttachment,
            ],
          })}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img', { name: 'Photo only' })).toBeNull();
    const toggle = screen.getByRole('button', { name: /expand post/i });
    fireEvent.click(toggle);

    const img = screen.getByRole('img', { name: 'Photo only' });
    expect(img).toBeInTheDocument();
    expect(container.querySelector('.post-content')).toBeNull();
  });
});

describe('TopicRow new-reply tag', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a Carbon green tag naming the unread count', () => {
    markThreadSeen('t1', 4);
    const { container } = render(
      <MemoryRouter>
        <TopicRow post={post({ repliesCount: 7 })} />
      </MemoryRouter>,
    );
    const tag = container.querySelector('.cds--tag--green');
    expect(tag).not.toBeNull();
    expect(tag).toHaveTextContent('+3 new');
    expect(screen.getByText('3 new replies')).toBeInTheDocument();
  });

  it('shows no tag for a thread with nothing unread', () => {
    markThreadSeen('t1', 7);
    const { container } = render(
      <MemoryRouter>
        <TopicRow post={post({ repliesCount: 7 })} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.cds--tag')).toBeNull();
  });
});
