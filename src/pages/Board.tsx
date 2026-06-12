/*
 * The sort pills are a segmented control: a role="group" of buttons. <fieldset>
 * (the prefer-native-tag suggestion) is for form field grouping and brings UA
 * chrome that doesn't fit a button group, so the role is intentional.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@carbon/react';
import { Add } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import StatusComposerModal from '../components/StatusComposerModal';
import TopicRow from '../components/TopicRow';
import { useBoardTimeline, useTagInfo } from '../hooks/api';
import { errorMessage } from '../utils/apiErrors';
import { pushToast } from '../utils/toast';
import styles from './Board.module.css';

type SortKey = 'activity' | 'newest' | 'replies';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'activity', label: 'Latest activity' },
  { key: 'newest', label: 'Newest' },
  { key: 'replies', label: 'Most replies' },
];

function sortPosts(posts: mastodon.v1.Status[], key: SortKey): mastodon.v1.Status[] {
  const copy = posts.slice();
  switch (key) {
    case 'newest':
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'replies':
      return copy.sort((a, b) => b.repliesCount - a.repliesCount);
    case 'activity':
      return copy;
  }
}

export default function Board() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { client, credentials } = useAuth();
  const [sort, setSort] = useState<SortKey>('activity');
  const [composerOpen, setComposerOpen] = useState(false);

  const decodedTag = tag ? decodeURIComponent(tag) : '';

  const {
    items: posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBoardTimeline(decodedTag);

  const sorted = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  const tagInfoQuery = useTagInfo(decodedTag);
  const tagInfo = tagInfoQuery.data;

  // A failed tag fetch just hides the Follow button; surface it as a non-blocking toast.
  useEffect(() => {
    if (tagInfoQuery.isError) {
      pushToast({
        kind: 'warning',
        title: 'Tag details unavailable',
        subtitle: errorMessage(tagInfoQuery.error, 'Tag metadata could not be loaded.'),
      });
    }
  }, [tagInfoQuery.isError, tagInfoQuery.error]);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!tagInfo) throw new Error('Tag info not loaded');
      return tagInfo.following
        ? requireClient(client).v1.tags.$select(decodedTag).unfollow()
        : requireClient(client).v1.tags.$select(decodedTag).follow();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tagInfo', decodedTag] });
      queryClient.invalidateQueries({ queryKey: ['followedTags'] });
    },
    onError: (err: unknown) =>
      pushToast({
        kind: 'error',
        title: "Couldn't update tag follow",
        subtitle: errorMessage(err, 'Please try again.'),
      }),
  });

  if (!credentials) {
    return (
      <div className={styles.signedOut}>
        <PageHeading>Not signed in</PageHeading>
        <Button onClick={() => navigate('/')}>Go to sign-in</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>#{decodedTag}</h1>
        <div className={styles.headerActions}>
          {tagInfo && (
            <Button
              kind={tagInfo.following ? 'tertiary' : 'secondary'}
              size="md"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {tagInfo.following ? 'Unfollow tag' : 'Follow tag'}
            </Button>
          )}
          <Button
            kind="primary"
            size="md"
            renderIcon={Add}
            onClick={() => setComposerOpen(true)}
          >
            New topic
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        {/* role="group" is the right semantic for a toggle-button set; the
            suggested native tags (fieldset etc.) are form-field containers. */}
        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div className={styles.sortPills} role="group" aria-label="Sort topics">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={styles.sortPill}
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <PaginatedList
        items={posts}
        isLoading={isLoading}
        error={error}
        errorTitle="Failed to load board"
        emptyMessage={`No active topics found in #${decodedTag} yet.`}
        emptyClassName={styles.empty}
        skeletonRows={5}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        <div className={styles.list}>
          {sorted.map((post) => (
            <TopicRow key={post.id} post={post} hideTag={decodedTag} headingLevel={2} />
          ))}
        </div>
      </PaginatedList>

      <StatusComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        mode={{ kind: 'new-topic', tag: decodedTag }}
      />
    </div>
  );
}
