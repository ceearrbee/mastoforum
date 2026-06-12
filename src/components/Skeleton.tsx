import styles from './Skeleton.module.css';

interface Props {
  rows?: number;
}

export default function SkeletonList({ rows = 5 }: Props) {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className={styles.row} key={i}>
          <div className={`${styles.avatar} ${styles.pulse}`} />
          <div className={styles.lineGroup}>
            <div className={`${styles.line} ${styles.lineMed} ${styles.pulse}`} />
            <div className={`${styles.line} ${styles.lineShort} ${styles.pulse}`} />
          </div>
          <div className={`${styles.line} ${styles.lineShort} ${styles.pulse}`} />
        </div>
      ))}
    </div>
  );
}
