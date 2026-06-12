import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import { expectNoA11yViolations } from './axe';
import PageHeading from '../components/PageHeading';
import TopicRow from '../components/TopicRow';

// Signed-out: every page should still render exactly one page-level <h1> (the
// header brand is no longer a heading). `client` is undefined so list hooks stay
// disabled and never fetch.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: undefined, credentials: null }),
}));

import Messages from '../pages/Messages';
import Notifications from '../pages/Notifications';
import FollowRequests from '../pages/FollowRequests';
import Scheduled from '../pages/Scheduled';

afterEach(cleanup);

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const post = {
  id: 't1',
  content: '<p>A topic body.</p>',
  spoilerText: '',
  createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
  repliesCount: 7,
  tags: [{ name: 'fediverse', url: '' }],
  account: { acct: 'ada@social', displayName: 'Ada Lovelace', username: 'ada', avatar: '' },
} as unknown as mastodon.v1.Status;

describe('heading structure', () => {
  it('PageHeading renders a single h1 carrying its class', () => {
    const { container } = render(<PageHeading className="x">Title</PageHeading>);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveClass('x');
    expect(h1s[0]).toHaveTextContent('Title');
  });

  it.each([
    ['Messages', <Messages key="m" />],
    ['Notifications', <Notifications key="n" />],
    ['Follow requests', <FollowRequests key="f" />],
    ['Scheduled', <Scheduled key="s" />],
  ])('signed-out %s renders exactly one h1', (_label, ui) => {
    const { container } = renderWithProviders(ui);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('TopicRow honours its headingLevel for valid nesting', () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <TopicRow post={post} headingLevel={3} />
        </main>
      </MemoryRouter>,
    );
    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.querySelector('h2')).toBeNull();
  });

  it('a page h1 → section h2 → TopicRow h3 hierarchy passes axe heading-order', async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <main>
          <h1>Profile</h1>
          <section aria-label="Recent topics">
            <h2>Recent topics</h2>
            <TopicRow post={post} headingLevel={3} />
          </section>
        </main>
      </MemoryRouter>,
    );
    await expectNoA11yViolations(baseElement);
  });
});
