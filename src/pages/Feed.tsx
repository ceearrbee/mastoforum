import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useFeedTimeline, type FeedSource } from '../hooks/api';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import SortPills, { PillGroup } from '../components/SortPills';
import TopicRow from '../components/TopicRow';
import { sortPosts, type SortKey } from '../utils/sortPosts';
import styles from './Feed.module.css';

const SOURCES: { key: FeedSource; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'local', label: 'Local' },
  { key: 'federated', label: 'Federated' },
];

const DETAIL: { key: 'collapsed' | 'expanded'; label: string }[] = [
  { key: 'collapsed', label: 'Titles' },
  { key: 'expanded', label: 'Full posts' },
];

const EMPTY_MESSAGE: Record<FeedSource, string> = {
  home: 'No topics in your home timeline yet.',
  local: 'No topics on this instance yet.',
  federated: 'No topics in the federated timeline yet.',
};

export default function Feed() {
  const { credentials } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [sort, setSort] = useState<SortKey>('activity');
  const source = settings.feedSource;

  const {
    items: posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedTimeline(source);

  const sorted = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>Feed</PageHeading>
        <p className={styles.empty}>Sign in to view your feed.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>Feed</PageHeading>

      <div className={styles.toolbar}>
        <PillGroup
          options={SOURCES}
          value={source}
          onChange={(key) => updateSettings({ feedSource: key })}
          label="Feed source"
        />
        <SortPills value={sort} onChange={setSort} />
        <PillGroup
          options={DETAIL}
          value={settings.feedExpanded ? 'expanded' : 'collapsed'}
          onChange={(key) => updateSettings({ feedExpanded: key === 'expanded' })}
          label="Post detail"
        />
      </div>

      <PaginatedList
        items={posts}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load feed"
        emptyMessage={EMPTY_MESSAGE[source]}
        emptyClassName={styles.empty}
        skeletonRows={5}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        <div className={styles.list}>
          {sorted.map((post) => (
            <TopicRow
              key={post.id}
              post={post}
              headingLevel={2}
              expanded={settings.feedExpanded}
              enhanceTabletop={settings.tabletopTools}
            />
          ))}
        </div>
      </PaginatedList>
    </div>
  );
}
