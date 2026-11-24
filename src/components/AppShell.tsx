import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BackToTop from './BackToTop';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import Header from './Header';
import LeftRail from './LeftRail';
import RateLimitToast from './RateLimitToast';
import Toaster from './Toaster';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { RAIL_BREAKPOINT } from '../config';
import styles from './AppShell.module.css';

const desktopQuery = `(min-width: ${RAIL_BREAKPOINT}px)`;
const isDesktopViewport = () => window.matchMedia(desktopQuery).matches;

export default function AppShell() {
  const { credentials } = useAuth();
  const { settings } = useSettings();
  const [navOpen, setNavOpen] = useState(() => isDesktopViewport() || settings.keepNavOpen);
  const location = useLocation();
  const [navPath, setNavPath] = useState(location.pathname);

  // Switching the "keep navigation open" preference on should reveal the nav
  // immediately.
  const [navPinned, setNavPinned] = useState(settings.keepNavOpen);
  if (navPinned !== settings.keepNavOpen) {
    setNavPinned(settings.keepNavOpen);
    if (settings.keepNavOpen) setNavOpen(true);
  }

  // Close the mobile drawer when the route changes, adjusting state during
  // render rather than in an effect.
  if (navPath !== location.pathname) {
    setNavPath(location.pathname);
    if (!isDesktopViewport() && !settings.keepNavOpen) setNavOpen(false);
  }

  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const railRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(navOpen);

  // Overlay-drawer behaviour only (not desktop, not pinned): focus moves into the
  // drawer on open, and Escape closes it and hands focus back to the toggle.
  const overlayDrawer = !isDesktopViewport() && !settings.keepNavOpen;
  useEffect(() => {
    const justOpened = navOpen && !wasOpenRef.current;
    wasOpenRef.current = navOpen;
    if (!navOpen || !overlayDrawer) return;
    if (justOpened) {
      railRef.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Carbon modals close on Escape from their own document listener, which
      // runs after this one; leave that keypress to the modal.
      if (document.querySelector('.cds--modal.is-visible')) return;
      setNavOpen(false);
      document.querySelector<HTMLElement>('[aria-controls="primary-nav"]')?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen, overlayDrawer]);

  const showRail = credentials != null;

  return (
    <div
      className={`${styles.shell} ${navOpen ? styles.navOpen : ''} ${
        settings.keepNavOpen ? styles.pinned : ''
      }`}
    >
      <a href="#main" className={styles.skipLink}>
        Skip to main content
      </a>
      <Header onMenuToggle={toggleNav} menuExpanded={navOpen} />
      <div className={styles.body}>
        {showRail && (
          // `inert` keeps the offscreen drawer's links out of the Tab order while closed.
          <aside
            id="primary-nav"
            ref={railRef}
            className={styles.rail}
            aria-label="Primary navigation"
            inert={!navOpen}
          >
            <LeftRail onNavigate={closeNav} />
          </aside>
        )}
        <main id="main" className={styles.main} tabIndex={-1}>
          <div className={styles.mainInner}>
            {/* Keyed by route so a page crash is contained to the main region
                (Header/rail/footer survive) and resets on navigation. */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <Footer />

      {/* Drawer backdrop. A real <button> so it's keyboard-operable (Enter/Space)
          and exposed as a control; removed from the tab order and the a11y tree
          while the drawer is closed (it's then non-interactive via CSS). */}
      <button
        type="button"
        className={styles.scrim}
        onClick={closeNav}
        aria-label="Close navigation"
        tabIndex={navOpen ? 0 : -1}
        aria-hidden={!navOpen}
      />
      <BackToTop />
      <RateLimitToast />
      <Toaster />
    </div>
  );
}
