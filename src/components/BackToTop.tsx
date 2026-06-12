import { useEffect, useRef, useState } from 'react';
import { UpToTop } from '@carbon/icons-react';
import { prefersReducedMotion } from '../utils/motion';
import styles from './BackToTop.module.css';

/** Scroll-to-top button, toggled by an IntersectionObserver sentinel (no scroll listener). */
export default function BackToTop() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // Shrink the root's top edge by 1.5 screens, so the sentinel only stops
      // intersecting after the user has scrolled past that point.
      { rootMargin: '-150% 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      {visible && (
        <button
          type="button"
          className={styles.button}
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <UpToTop size={20} />
        </button>
      )}
    </>
  );
}
