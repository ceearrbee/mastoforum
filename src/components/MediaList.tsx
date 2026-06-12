import type { mastodon } from 'masto';
import styles from './MediaList.module.css';

interface Props {
  media: mastodon.v1.MediaAttachment[];
}

export default function MediaList({ media }: Props) {
  return (
    <div className={styles.list}>
      {media.map((m) => (
        <figure key={m.id} className={styles.item}>
          <MediaItem media={m} />
          {m.description && <figcaption className={styles.alt}>{m.description}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function MediaItem({ media }: { media: mastodon.v1.MediaAttachment }) {
  // Media attachments are content, not decoration: when the author gave no
  // description, fall back to a generic label so screen readers announce
  // *something* rather than skipping the image entirely.
  const alt = media.description?.trim() || `${media.type} attachment, no description`;
  switch (media.type) {
    case 'image':
      return media.previewUrl ? (
        <div className={styles.image}>
          <a href={media.url ?? media.previewUrl} target="_blank" rel="noopener noreferrer">
            <img src={media.previewUrl} alt={alt} loading="lazy" />
          </a>
        </div>
      ) : null;
    case 'gifv':
      return media.url ? (
        <div className={styles.video}>
          <video
            src={media.url}
            poster={media.previewUrl ?? undefined}
            aria-label={alt}
            autoPlay
            muted
            loop
            playsInline
          >
            <track kind="captions" />
          </video>
        </div>
      ) : null;
    case 'video':
      return media.url ? (
        <div className={styles.video}>
          <video
            src={media.url}
            poster={media.previewUrl ?? undefined}
            aria-label={alt}
            controls
            preload="metadata"
          >
            <track kind="captions" />
          </video>
        </div>
      ) : null;
    case 'audio':
      return media.url ? (
        <div className={styles.audio}>
          <audio src={media.url} aria-label={alt} controls preload="metadata">
            <track kind="captions" />
          </audio>
        </div>
      ) : null;
    default:
      return (
        <div className={styles.unknown}>
          <span>📎 Attachment ({media.type})</span>
          {media.url && (
            <a href={media.url} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          )}
        </div>
      );
  }
}
