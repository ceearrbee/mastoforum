import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentThreadRow from './RecentThreadRow';

describe('RecentThreadRow', () => {
  it('renders title, author, tag, and replies when fully populated', () => {
    render(
      <MemoryRouter>
        <RecentThreadRow
          thread={{
            id: 't1',
            title: 'Hidden cove',
            viewedAt: Date.now() - 60 * 1000,
            createdAt: '2026-05-01T00:00:00Z',
            repliesCount: 12,
            primaryTag: 'scifirp',
            account: {
              acct: 'ada@social',
              displayName: 'Ada Lovelace',
              username: 'ada',
            },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Hidden cove')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('@ada@social')).toBeInTheDocument();
    expect(screen.getByText('#scifirp')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/Replies/i)).toBeInTheDocument();
  });

  it('degrades gracefully when only id/title/viewedAt are present', () => {
    render(
      <MemoryRouter>
        <RecentThreadRow
          thread={{ id: 'legacy', title: 'old thread', viewedAt: 1717_000_000_000 }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('old thread')).toBeInTheDocument();
    expect(screen.queryByText(/Replies/i)).toBeNull();
  });
});
