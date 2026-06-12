import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useListTimeline } from '../hooks/api';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import TopicRow from '../components/TopicRow';
import styles from './ListTimeline.module.css';

export default function ListTimeline() {
  const { id } = useParams<{ id: string }>();
  const { client, credentials } = useAuth();

  const { data: list } = useQuery<mastodon.v1.List>({
    queryKey: ['list', id],
    queryFn: () => requireClient(client).v1.lists.$select(id!).fetch(),
    enabled: !!client && !!id,
    staleTime: 5 * 60_000,
  });

  const {
    items: posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListTimeline(id);

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading className={styles.heading}>List</PageHeading>
        <p className={styles.empty}>Sign in to view your lists.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.heading}>{list?.title ?? 'List'}</PageHeading>

      <PaginatedList
        items={posts}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load list"
        emptyMessage="No posts in this list yet."
        emptyClassName={styles.empty}
        skeletonRows={5}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
      <div className={styles.list}>
        {posts.map((post) => (
          <TopicRow key={post.id} post={post} headingLevel={2} />
        ))}
      </div>
      </PaginatedList>
    </div>
  );
}
