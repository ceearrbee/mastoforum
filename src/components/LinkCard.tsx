import type { mastodon } from 'masto';
import styles from './LinkCard.module.css';

interface Props {
  card: mastodon.v1.TrendLink | mastodon.v1.PreviewCard;
}

/** Compact preview card for a trending link. */
export default function LinkCard({ card }: Props) {
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      {card.image && (
        <img src={card.image} alt="" loading="lazy" className={styles.thumb} />
      )}
      <span className={styles.body}>
        <span className={styles.title}>{card.title}</span>
        {card.description && <span className={styles.desc}>{card.description}</span>}
        {card.providerName && <span className={styles.provider}>{card.providerName}</span>}
      </span>
    </a>
  );
}
