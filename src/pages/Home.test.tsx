import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    client: undefined,
    credentials: { url: 'https://home.example', token: 't' },
  }),
}));

const emptyList = {
  items: [],
  isLoading: false,
  error: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
};
vi.mock('../hooks/api', () => ({
  useFollowedTags: () => ({ data: [] }),
  useBookmarks: () => emptyList,
  useFavourites: () => emptyList,
}));

// Network-backed panels are irrelevant to the heading structure.
vi.mock('../components/TrendingPanel', () => ({ default: () => null }));
vi.mock('../components/WhoToFollow', () => ({ default: () => null }));
vi.mock('../components/AnnouncementsBanner', () => ({ default: () => null }));

beforeEach(() => {
  // jsdom has no matchMedia; Carbon Tabs read it on mount.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe('signed-in Home', () => {
  it('renders exactly one h1 named Home', () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });
});
