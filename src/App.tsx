import { lazy, Suspense, useEffect, useMemo, useSyncExternalStore } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GlobalTheme, Loading, Theme } from '@carbon/react';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { sanitizeCustomCss } from './utils/customCss';
import { APP_CONFIG } from './config';

// Served under /<repo>/ on GitHub Pages project sites; '/' elsewhere. RR wants
// the basename without a trailing slash.
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const Home = lazy(() => import('./pages/Home'));
const Board = lazy(() => import('./pages/Board'));
const Thread = lazy(() => import('./pages/Thread'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const Scheduled = lazy(() => import('./pages/Scheduled'));
const FollowRequests = lazy(() => import('./pages/FollowRequests'));
const ListTimeline = lazy(() => import('./pages/ListTimeline'));
const Profile = lazy(() => import('./pages/Profile'));
const Search = lazy(() => import('./pages/Search'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

type CarbonTheme = 'white' | 'g10' | 'g90' | 'g100';

const darkMediaQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function subscribeOsTheme(callback: () => void): () => void {
  const mq = darkMediaQuery();
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function useOsTheme(): CarbonTheme {
  return useSyncExternalStore(
    subscribeOsTheme,
    () => (darkMediaQuery().matches ? 'g90' : 'white'),
    () => 'white',
  );
}

function ThemedApp() {
  const { settings } = useSettings();
  const osTheme = useOsTheme();
  // Keep the tab title correct even if the build-time HTML placeholder wasn't
  // substituted (falls back to 'mastoforum' via APP_CONFIG).
  useEffect(() => {
    document.title = APP_CONFIG.appName;
  }, []);
  // High-contrast variants use Carbon's most extreme tokens (pure white / g100)
  // and add an `hc` class that strengthens borders and focus outlines.
  const themeMap: Record<string, CarbonTheme> = {
    light: 'white',
    dark: 'g90',
    'hc-light': 'white',
    'hc-dark': 'g100',
  };
  const activeTheme: CarbonTheme = themeMap[settings.theme] ?? osTheme;
  const highContrast = settings.theme === 'hc-light' || settings.theme === 'hc-dark';
  // Scope + sanitize custom CSS before injecting (strip @import / remote urls,
  // confine to `.app-root`). Memoized so we only re-parse when it changes.
  const scopedCustomCss = useMemo(
    () => sanitizeCustomCss(settings.customCss).css,
    [settings.customCss],
  );

  return (
    <Theme theme={activeTheme}>
      <GlobalTheme theme={activeTheme}>
        <div
          className={`app-root density-${settings.density} width-${settings.readingWidth} ${highContrast ? 'hc' : ''}`}
          style={{
            backgroundColor: 'var(--cds-background)',
            color: 'var(--cds-text-primary)',
          }}
        >
          {scopedCustomCss && <style>{scopedCustomCss}</style>}
          <BrowserRouter basename={ROUTER_BASENAME}>
            <ErrorBoundary>
              <Suspense fallback={<Loading description="Loading" withOverlay={false} />}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/board/:tag" element={<Board />} />
                    <Route path="/thread/:id" element={<Thread />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/scheduled" element={<Scheduled />} />
                    <Route path="/follow-requests" element={<FollowRequests />} />
                    <Route path="/list/:id" element={<ListTimeline />} />
                    <Route path="/search" element={<Search />} />
                    {/* RR7 only treats `:param` as dynamic right after a `/`,
                        so `/@:acct` matched literally and 404'd every handle.
                        Capture the whole segment (incl. the leading `@`) and
                        strip it in the Profile loader. */}
                    <Route path="/:acct" element={<Profile />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route path="/auth" element={<AuthCallback />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </div>
      </GlobalTheme>
    </Theme>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
