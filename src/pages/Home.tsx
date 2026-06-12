import { useActionState, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  InlineLoading,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
} from '@carbon/react';
import type { mastodon } from 'masto';
import { initiateMastodonLogin } from '../utils/auth';
import { errorMessage } from '../utils/apiErrors';
import { useAuth } from '../context/AuthContext';
import { useBookmarks, useFavourites, useFollowedTags } from '../hooks/api';
import { clearRecentThreads, useRecentThreads } from '../utils/recentThreads';
import TagPill from '../components/TagPill';
import ConfirmModal from '../components/ConfirmModal';
import RecentThreadRow from '../components/RecentThreadRow';
import TrendingPanel from '../components/TrendingPanel';
import WhoToFollow from '../components/WhoToFollow';
import AnnouncementsBanner from '../components/AnnouncementsBanner';
import PaginatedList from '../components/PaginatedList';
import { statusTitle } from '../utils/status';
import { APP_CONFIG, STARTER_TAGS } from '../config';
import styles from './Home.module.css';

export default function Home() {
  const { credentials } = useAuth();
  const navigate = useNavigate();
  const recents = useRecentThreads();

  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const { data: followedTags = [] } = useFollowedTags();

  const bookmarksQuery = useBookmarks();
  const bookmarks = bookmarksQuery.items;

  const favouritesQuery = useFavourites();
  const favourites = favouritesQuery.items;

  // React 19 form action: pending + error come from useActionState rather than
  // hand-tracked `isLoggingIn`/`loginError` flags. On success the browser
  // redirects to the instance, so the resolved value is just the next error ('').
  const [loginError, loginAction, isLoggingIn] = useActionState<string, FormData>(
    async (_prev, formData) => {
      const value = String(formData.get('instance') ?? '').trim();
      if (!value) return '';
      try {
        await initiateMastodonLogin(value);
        return '';
      } catch (err) {
        return errorMessage(err, 'Failed to connect to instance');
      }
    },
    '',
  );

  const browseTag = (formData: FormData) => {
    const tag = String(formData.get('tag') ?? '').trim().replace(/^#/, '');
    if (tag) navigate(`/board/${encodeURIComponent(tag)}`);
  };

  if (!credentials) {
    return (
      <div className={styles.signin}>
        <h1 className={styles.signinTitle}>{APP_CONFIG.appName}</h1>
        <p className={styles.signinLead}>
          A forum-style frontend for Mastodon hashtag timelines. Connect to your instance to begin.
        </p>
        <Form action={loginAction}>
          <Stack gap={5}>
            <TextInput
              id="instance-url"
              name="instance"
              labelText="Mastodon instance"
              helperText="e.g. mastodon.social or writing.exchange"
              placeholder="mastodon.social"
              disabled={isLoggingIn}
              invalid={!!loginError}
              invalidText={loginError}
              required
            />
            {isLoggingIn ? (
              <InlineLoading description="Connecting…" />
            ) : (
              <Button type="submit">Connect &amp; sign in</Button>
            )}
          </Stack>
        </Form>
      </div>
    );
  }

  const topRecents = recents.slice(0, 5);
  const firstRun = topRecents.length === 0 && followedTags.length === 0;

  return (
    <div className={styles.page}>
      <AnnouncementsBanner />

      <Form action={browseTag} className={styles.searchRow}>
        <div className={styles.searchInput}>
          <TextInput
            id="home-search-tag"
            name="tag"
            labelText="Find a tag"
            hideLabel
            placeholder="Find a tag — e.g. fediverse, books, photography"
            size="lg"
            required
          />
        </div>
        <Button type="submit" size="lg">
          Browse
        </Button>
      </Form>

      {firstRun && (
        <section className={styles.onboard} aria-label="Getting started">
          <h2 className={styles.onboardTitle}>Welcome to {APP_CONFIG.appName}</h2>
          <p className={styles.onboardLead}>
            Every hashtag is a <strong>board</strong> — posts become topics, and replies become
            threads you can read top-to-bottom. Search a tag above, or jump into a popular board:
          </p>
          <div className={styles.onboardTags}>
            {STARTER_TAGS.map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
          </div>
          <p className={styles.onboardHint}>
            Boards you follow and threads you open will show up here for quick access.
          </p>
        </section>
      )}

      <TrendingPanel />

      <WhoToFollow />

      {followedTags.length > 0 && (
        <section className={styles.section} aria-label="Your tags">
          <h2 className={styles.heading}>Your tags</h2>
          <div className={styles.tagRow}>
            {followedTags.map((tag) => (
              <TagPill key={tag.name} name={tag.name} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.section} aria-label="Saved posts">
        <Tabs>
          <TabList aria-label="Saved posts">
            <Tab>Bookmarks</Tab>
            <Tab>Favourites</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.tabPanel}>
              <PaginatedList
                items={bookmarks}
                isLoading={bookmarksQuery.isLoading}
                error={bookmarksQuery.error}
                errorTitle="Couldn't load bookmarks"
                emptyMessage="No bookmarked posts."
                emptyClassName={styles.empty}
                skeletonRows={3}
                hasNextPage={bookmarksQuery.hasNextPage}
                isFetchingNextPage={bookmarksQuery.isFetchingNextPage}
                fetchNextPage={bookmarksQuery.fetchNextPage}
              >
                {bookmarks.length > 0 && (
                  <PostLinkList
                    posts={bookmarks}
                    previewOf={statusTitle}
                    hint={(p) => `Saved from @${p.account.acct}`}
                  />
                )}
              </PaginatedList>
            </TabPanel>
            <TabPanel className={styles.tabPanel}>
              <PaginatedList
                items={favourites}
                isLoading={favouritesQuery.isLoading}
                error={favouritesQuery.error}
                errorTitle="Couldn't load favourites"
                emptyMessage="No favourited posts."
                emptyClassName={styles.empty}
                skeletonRows={3}
                hasNextPage={favouritesQuery.hasNextPage}
                isFetchingNextPage={favouritesQuery.isFetchingNextPage}
                fetchNextPage={favouritesQuery.fetchNextPage}
              >
                {favourites.length > 0 && (
                  <PostLinkList
                    posts={favourites}
                    previewOf={statusTitle}
                    hint={(p) => `By @${p.account.acct}`}
                  />
                )}
              </PaginatedList>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>

      {topRecents.length > 0 && (
        <section className={styles.section} aria-label="Continue reading">
          <div className={styles.sectionHeader}>
            <h2 className={styles.heading}>Continue reading</h2>
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setClearHistoryOpen(true)}
            >
              Clear history
            </button>
          </div>
          <div className={styles.recents}>
            {topRecents.map((thread) => (
              <RecentThreadRow key={thread.id} thread={thread} />
            ))}
          </div>
        </section>
      )}

      <ConfirmModal
        open={clearHistoryOpen}
        heading="Clear history"
        primaryText="Clear history"
        onConfirm={clearRecentThreads}
        onClose={() => setClearHistoryOpen(false)}
      >
        Clear your recent thread history? Boards and threads you open will start
        collecting here again.
      </ConfirmModal>
    </div>
  );
}

function PostLinkList({
  posts,
  hint,
  previewOf,
}: {
  posts: mastodon.v1.Status[];
  hint: (p: mastodon.v1.Status) => string;
  previewOf: (p: mastodon.v1.Status) => string;
}) {
  return (
    <ul className={styles.postList}>
      {posts.map((post) => (
        <li key={post.id} className={styles.postListItem}>
          <Link to={`/thread/${encodeURIComponent(post.id)}`}>
            <span className={styles.postLinkTitle}>{previewOf(post)}</span>
            <span className={styles.postLinkMeta}>{hint(post)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
