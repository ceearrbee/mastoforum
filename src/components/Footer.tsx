import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../config';
import ShortcutsHelpModal from './ShortcutsHelpModal';
import styles from './Footer.module.css';

export default function Footer() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </footer>
  );
}
