import { afterEach, describe, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { mastodon } from 'masto';
import { expectNoA11yViolations } from './axe';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';
import NotFound from '../pages/NotFound';
import TopicRow from '../components/TopicRow';
import LinkCard from '../components/LinkCard';
import CharCounter from '../components/CharCounter';
import ShortcutsHelpModal from '../components/ShortcutsHelpModal';

afterEach(cleanup);

const post = {
  id: 't1',
  content: '<p>A topic body.</p>',
  spoilerText: '',
  createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
  repliesCount: 7,
  tags: [{ name: 'fediverse', url: '' }],
  account: { acct: 'ada@social', displayName: 'Ada Lovelace', username: 'ada', avatar: '' },
} as unknown as mastodon.v1.Status;

const card = {
  url: 'https://example.com/a',
  title: 'A trending article',
  description: 'Worth a read.',
  providerName: 'Example News',
  image: 'https://example.com/i.png',
  type: 'link',
} as unknown as mastodon.v1.TrendLink;

describe('accessibility (axe)', () => {
  it('Privacy page has no violations', async () => {
    const { baseElement } = render(<Privacy />);
    await expectNoA11yViolations(baseElement);
  });

  it('Terms page has no violations', async () => {
    const { baseElement } = render(<Terms />);
    await expectNoA11yViolations(baseElement);
  });

  it('NotFound page has no violations', async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    await expectNoA11yViolations(baseElement);
  });

  it('TopicRow has no violations', async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <main>
          <TopicRow post={post} />
        </main>
      </MemoryRouter>,
    );
    await expectNoA11yViolations(baseElement);
  });

  it('LinkCard has no violations', async () => {
    const { baseElement } = render(
      <main>
        <LinkCard card={card} />
      </main>,
    );
    await expectNoA11yViolations(baseElement);
  });

  it('CharCounter has no violations', async () => {
    const { baseElement } = render(
      <main>
        <CharCounter remaining={-3} />
      </main>,
    );
    await expectNoA11yViolations(baseElement);
  });

  it('ShortcutsHelpModal has no violations', async () => {
    const { baseElement } = render(<ShortcutsHelpModal open onClose={() => {}} />);
    await expectNoA11yViolations(baseElement);
  });
});
