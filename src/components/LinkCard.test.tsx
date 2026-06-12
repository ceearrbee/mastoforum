import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { mastodon } from 'masto';
import LinkCard from './LinkCard';

function card(overrides: Partial<mastodon.v1.TrendLink> = {}): mastodon.v1.TrendLink {
  return {
    url: 'https://example.com/article',
    title: 'A trending article',
    description: 'Something everyone is reading right now.',
    providerName: 'Example News',
    image: 'https://example.com/img.png',
    type: 'link',
    ...overrides,
  } as unknown as mastodon.v1.TrendLink;
}

describe('LinkCard', () => {
  it('renders the title as an external link to the url', () => {
    render(<LinkCard card={card()} />);
    const link = screen.getByRole('link', { name: /A trending article/ });
    expect(link).toHaveAttribute('href', 'https://example.com/article');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows the provider name', () => {
    render(<LinkCard card={card()} />);
    expect(screen.getByText('Example News')).toBeInTheDocument();
  });

  it('renders the thumbnail with empty alt when present', () => {
    const { container } = render(<LinkCard card={card()} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
    expect(img).toHaveAttribute('alt', '');
  });

  it('omits the image when there is none', () => {
    const { container } = render(<LinkCard card={card({ image: null })} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
