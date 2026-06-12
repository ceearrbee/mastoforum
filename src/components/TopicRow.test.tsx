import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import TopicRow from './TopicRow';

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
});
