import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '@carbon/react';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import styles from './MediaList.module.css';

interface Props {
  media: mastodon.v1.MediaAttachment[];
}

export default function MediaList({ media }: Props) {
  const images = media.filter((m) => m.type === 'image');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const activeImage = activeImageIndex !== null ? images[activeImageIndex] : null;

  useEffect(() => {
    if (activeImageIndex === null || images.length <= 1) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveImageIndex((prev) =>
          prev !== null ? (prev - 1 + images.length) % images.length : 0,
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveImageIndex((prev) =>
          prev !== null ? (prev + 1) % images.length : 0,
        );
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, images.length]);

  return (
    <>
      <div className={styles.list}>
        {media.map((m) => {
          const imgIdx = images.findIndex((img) => img.id === m.id);
          return (
            <figure key={m.id} className={styles.item}>
              <MediaItem
                media={m}
                onSelect={imgIdx !== -1 ? () => setActiveImageIndex(imgIdx) : undefined}
              />
              {m.description && <figcaption className={styles.alt}>{m.description}</figcaption>}
            </figure>
          );
        })}
      </div>

      {activeImage &&
        (typeof document !== 'undefined'
          ? createPortal(
              <Modal
                open={activeImageIndex !== null}
                onRequestClose={() => setActiveImageIndex(null)}
                passiveModal
                modalHeading={
                  images.length > 1
                    ? `Image ${activeImageIndex! + 1} of ${images.length}`
                    : activeImage.description
                      ? 'Image preview'
                      : 'Image'
                }
                size="lg"
                aria-label={activeImage.description?.trim() || 'Image preview'}
              >
                <div className={styles.lightbox}>
                  <div className={styles.lightboxImageWrap}>
                    <img
                      src={activeImage.url ?? activeImage.previewUrl ?? ''}
                      alt={activeImage.description?.trim() || 'Image attachment'}
                      className={styles.lightboxImage}
                    />
                  </div>
                  {activeImage.description && (
                    <p className={styles.lightboxAlt}>{activeImage.description}</p>
                  )}
                  <div className={styles.lightboxActions}>
                    {images.length > 1 ? (
                      <div className={styles.navGroup}>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveImageIndex(
                              (activeImageIndex! - 1 + images.length) % images.length,
                            )
                          }
                          renderIcon={ChevronLeft}
                          hasIconOnly
                          iconDescription="Previous image"
                        />
                        <span className={styles.counter}>
                          {activeImageIndex! + 1} of {images.length}
                        </span>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveImageIndex((activeImageIndex! + 1) % images.length)
                          }
                          renderIcon={ChevronRight}
                          hasIconOnly
                          iconDescription="Next image"
                        />
                      </div>
                    ) : (
                      <div />
                    )}
                    {activeImage.url && (
                      <a
                        href={activeImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.originalLink}
                      >
                        Open original
                      </a>
                    )}
                  </div>
                </div>
              </Modal>,
              document.body,
            )
          : null)}
    </>
  );
}

function MediaItem({
  media,
  onSelect,
}: {
  media: mastodon.v1.MediaAttachment;
  onSelect?: () => void;
}) {
  // Media attachments are content, not decoration: when the author gave no
  // description, fall back to a generic label so screen readers announce
  // *something* rather than skipping the image entirely.
  const alt = media.description?.trim() || `${media.type} attachment, no description`;
  switch (media.type) {
    case 'image': {
      const src = media.previewUrl || media.url;
      return src ? (
        <div className={styles.image}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            aria-haspopup="dialog"
          >
            <img src={src} alt={alt} loading="lazy" />
          </button>
        </div>
      ) : null;
    }
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
