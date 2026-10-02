import { useState } from 'react';
import { Button } from '@carbon/react';
import { Flash } from '@carbon/icons-react';
import type { InitiativeEntry } from '../utils/ttrpg/initiative';
import styles from './InitiativeTracker.module.css';

interface Props {
  entries: InitiativeEntry[];
}

export default function InitiativeTracker({ entries }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (entries.length < 2) return null;

  const handleNextTurn = () => {
    setActiveIndex((prev) => (prev + 1) % entries.length);
  };

  return (
    <div className={styles.bar} role="region" aria-label="Combat initiative tracker">
      <div className={styles.left}>
        <span className={styles.title}>
          <Flash size={16} aria-hidden="true" />
          Initiative
        </span>
        <ol className={styles.list}>
          {entries.map((entry, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                key={`${entry.name}-${entry.statusId}`}
                className={`${styles.item} ${isActive ? styles.active : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <a href={`#post-${entry.statusId}`}>
                  <span>#{idx + 1}</span>
                  <span>{entry.name}</span>
                  <span className={styles.roll}>{entry.roll}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      <Button kind="ghost" size="sm" onClick={handleNextTurn}>
        Next turn
      </Button>
    </div>
  );
}
