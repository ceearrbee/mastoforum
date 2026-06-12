import { APP_CONFIG } from '../config';
import styles from './StaticDoc.module.css';

export default function Privacy() {
  return (
    <main className={styles.doc}>
      <h1>Privacy</h1>
      <p className={styles.updated}>Last updated 2026-05-28.</p>

      <p>
        {APP_CONFIG.appName} is a client-side web application. It runs entirely in your
        browser and talks directly to the Mastodon instance you sign in to. There is no
        backend operated by this app.
      </p>

      <h2>What is stored on your device</h2>
      <ul>
        <li>
          Your home instance URL, an OAuth <code>client_id</code> created for this app, and
          an access token, in <code>localStorage</code>.
        </li>
        <li>
          A short-lived PKCE <code>code_verifier</code> and <code>state</code> nonce in
          <code>sessionStorage</code> during sign-in; cleared on success.
        </li>
        <li>
          Your interface settings (theme, density, thread view) and a list of up to
          15 recently viewed thread titles, in <code>localStorage</code>.
        </li>
        <li>
          Any custom CSS you enter in Preferences, in <code>localStorage</code>. It is
          applied locally only (scoped to the app, with <code>@import</code> and remote
          <code>url()</code> values removed) and never sent anywhere.
        </li>
        <li>
          A cached copy of your instance's media upload limits.
        </li>
      </ul>

      <h2>What is sent over the network</h2>
      <ul>
        <li>
          Requests directly to your home instance's Mastodon API, authenticated with
          your access token.
        </li>
        <li>
          One unauthenticated request to <code>/api/v1/apps</code> on first sign-in to
          register this app on your instance.
        </li>
        <li>
          No third-party analytics, tracking pixels, ad networks, or telemetry are
          loaded by this client.
        </li>
      </ul>

      <h2>Logging out</h2>
      <p>
        Signing out revokes your access token with the instance and clears all of the
        above local data. You can also clear browsing data in your browser at any time.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about a specific deployment of this client, contact whoever
        operates the URL you signed in through.
      </p>
    </main>
  );
}
