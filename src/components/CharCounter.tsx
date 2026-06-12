import styles from './CharCounter.module.css';

interface Props {
  /** Characters left in the budget; negative means over the limit. */
  remaining: number;
}

/** Remaining-character indicator; goes red and sets `data-over` when negative. */
export default function CharCounter({ remaining }: Props) {
  const over = remaining < 0;
  return (
    <span
      className={styles.counter}
      data-over={over}
      aria-live="polite"
      title={over ? 'Over the character limit' : 'Characters remaining'}
    >
      {remaining}
    </span>
  );
}
