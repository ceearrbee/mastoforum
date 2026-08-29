import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG, BUILD_INFO } from '../config';
import ShortcutsHelpModal from './ShortcutsHelpModal';
import styles from './Footer.module.css';

/** `2026-08-29` from the build's ISO timestamp; empty when it wasn't injected. */
function buildDate(): string {
  const date = new Date(BUILD_INFO.time);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export default function Footer() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const date = buildDate();
  // Link the commit to its page on the forge when we know where the source lives.
  const commitUrl = APP_CONFIG.repoUrl
    ? `${APP_CONFIG.repoUrl}/commit/${BUILD_INFO.commit.replace('-dirty', '')}`
    : null;
  return (
    <footer className={styles.footer} >
      <span className={styles.brand}>{APP_CONFIG.appName}</span>
      <nav className={styles.links} aria-label="Site information">
        <Link to="/privacy" className={styles.link}>
          Privacy
        </Link>
        <Link to="/terms" className={styles.link}>
          Terms
        </Link>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setShortcutsOpen(true)}
        >
          Keyboard shortcuts
        </button>
        {APP_CONFIG.repoUrl && (
          <a
            href={APP_CONFIG.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            GitHub ↗
          </a>
        )}
      </nav>
      <p className={styles.build}>
        <span>v{BUILD_INFO.version}</span>
        <span aria-hidden="true">·</span>
        {commitUrl ? (
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.commit}
            title="Build commit"
          >
            {BUILD_INFO.commit}
          </a>
        ) : (
          <span className={styles.commit} title="Build commit">
            {BUILD_INFO.commit}
          </span>
        )}
        {date && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={BUILD_INFO.time} title={`Built ${new Date(BUILD_INFO.time).toLocaleString()}`}>
              {date}
            </time>
          </>
        )}
      </p>
      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </footer>
  );
}
