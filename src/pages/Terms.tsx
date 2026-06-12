import { APP_CONFIG } from '../config';
import styles from './StaticDoc.module.css';

export default function Terms() {
  return (
    <main className={styles.doc}>
      <h1>Terms of use</h1>
      <p className={styles.updated}>Last updated 2026-05-28.</p>

      <p>
        {APP_CONFIG.appName} is a frontend for Mastodon servers. The terms of service
        of your home instance govern any posts, follows, or other interactions you
        perform with it. This client does not host content of its own.
      </p>

      <h2>No warranty</h2>
      <p>
        This software is provided "as is", without warranty of any kind. Use at your
        own risk.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use this client to violate the rules of your Mastodon instance.</li>
        <li>Do not use it for automated abuse or to bypass rate limits.</li>
      </ul>

      <h2>Source &amp; modifications</h2>
      <p>
        This client is open source. If you run a modified copy under a different brand
        you must replace these terms with your own.
      </p>
    </main>
  );
}
