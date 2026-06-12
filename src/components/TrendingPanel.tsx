import { InlineLoading, InlineNotification } from '@carbon/react';
import { errorMessage } from '../utils/apiErrors';
import { useTrends } from '../hooks/api';
import TagPill from './TagPill';
import TopicRow from './TopicRow';
import LinkCard from './LinkCard';
import styles from './TrendingPanel.module.css';

/** Home discovery: trending tags/posts/links; hidden when the instance exposes none. */
export default function TrendingPanel() {
  const { tags, statuses, links } = useTrends();

  const loading = tags.isLoading || statuses.isLoading || links.isLoading;
  const firstError = tags.error ?? statuses.error ?? links.error;
  const tagList = tags.data ?? [];
  const statusList = statuses.data ?? [];
  const linkList = links.data ?? [];
  const empty = tagList.length === 0 && statusList.length === 0 && linkList.length === 0;

  // Once settled with nothing to show, render nothing (vanilla instances with
  // trends disabled, or a fresh instance with no activity yet).
  if (!loading && empty && !firstError) return null;

  return (
    <section className={styles.panel} aria-label="Trending">
      <h2 className={styles.heading}>Trending</h2>

      {loading && empty ? (
        <InlineLoading description="Loading trends…" />
      ) : (
        <>
          {firstError && (
            <InlineNotification
              kind="warning"
              title="Some trends are unavailable"
              subtitle={errorMessage(firstError)}
              lowContrast
              hideCloseButton
            />
          )}

          <div className={styles.groups}>
            {tagList.length > 0 && (
              <div className={styles.group}>
                <h3 className={styles.subheading}>Tags</h3>
                <div className={styles.tagRow}>
                  {tagList.map((tag) => (
                    <TagPill key={tag.name} name={tag.name} />
                  ))}
                </div>
              </div>
            )}

            {statusList.length > 0 && (
              <div className={styles.group}>
                <h3 className={styles.subheading}>Posts</h3>
                <div className={styles.posts}>
                  {statusList.map((post) => (
                    <TopicRow key={post.id} post={post} headingLevel={4} />
                  ))}
                </div>
              </div>
            )}

            {linkList.length > 0 && (
              <div className={styles.group}>
                <h3 className={styles.subheading}>Links</h3>
                <div className={styles.links}>
                  {linkList.map((link) => (
                    <LinkCard key={link.url} card={link} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
