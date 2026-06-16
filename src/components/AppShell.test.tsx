import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import AppShell from './AppShell';
import { SettingsProvider } from '../context/SettingsContext';

// Keep the test focused on AppShell's own open/close logic — stub the heavy
// children (Header pulls in many API hooks). The Header stub re-exposes the
// onMenuToggle prop as a plain button so a test can open the drawer.
vi.mock('./Header', () => ({
  default: ({ onMenuToggle }: { onMenuToggle?: () => void }) => (
    <button type="button" onClick={onMenuToggle}>
      toggle-menu
    </button>
  ),
}));
vi.mock('./LeftRail', () => ({ default: () => <nav>rail</nav> }));
vi.mock('./Footer', () => ({ default: () => <footer>footer</footer> }));
vi.mock('./BackToTop', () => ({ default: () => null }));
vi.mock('./RateLimitToast', () => ({ default: () => null }));
vi.mock('./Toaster', () => ({ default: () => null }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ credentials: { url: 'https://home.example', token: 't' } }),
}));

beforeEach(() => {
  localStorage.clear();
  // jsdom has no matchMedia; report a narrow viewport (below the rail breakpoint)
  // so we exercise the drawer path that auto-closes on navigation.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

function renderShell() {
  const { container } = render(
    <SettingsProvider>
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/a" element={<Link to="/b">go-b</Link>} />
            <Route path="/b" element={<div>page-b</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );
  // The scrim button reflects open state via aria-hidden regardless of CSS.
  const isOpen = () =>
    container
      .querySelector('button[aria-label="Close navigation"]')
      ?.getAttribute('aria-hidden') === 'false';
  return { isOpen };
}

describe('AppShell navigation drawer', () => {
  it('closes the drawer on navigation by default', () => {
    const { isOpen } = renderShell();
    expect(isOpen()).toBe(false);

    fireEvent.click(screen.getByText('toggle-menu'));
    expect(isOpen()).toBe(true);

    fireEvent.click(screen.getByText('go-b'));
    expect(isOpen()).toBe(false);
  });

  it('keeps the drawer open across navigation when keepNavOpen is set', () => {
    localStorage.setItem('masto_settings', JSON.stringify({ keepNavOpen: true }));
    const { isOpen } = renderShell();
    expect(isOpen()).toBe(true);

    fireEvent.click(screen.getByText('go-b'));
    expect(isOpen()).toBe(true);
  });
});
