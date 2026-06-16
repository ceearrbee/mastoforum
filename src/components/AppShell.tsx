import { useCallback, useState } from 'react';
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
          <aside id="primary-nav" className={styles.rail} aria-label="Primary navigation">
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
