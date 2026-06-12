import type { CSSProperties, ReactNode } from 'react';
import styles from './SuggestPopover.module.css';

interface Props {
  /**
   * Anchored mode fills the width of a positioned parent and sits just below
   * it (header search). Default (fixed) mode positions at the given `style`
   * coordinates (composer cursor).
   */
  anchored?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}

/** Floating container for autocomplete suggestions, shared by the composer and header search. */
export default function SuggestPopover({ anchored = false, style, children }: Props) {
  return (
    <div
      className={`${styles.popover} ${anchored ? styles.anchored : styles.fixed}`}
      style={style}
    >
      {children}
    </div>
  );
}
