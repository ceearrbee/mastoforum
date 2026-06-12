import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  InlineNotification,
  Loading,
} from '@carbon/react';
import { VolumeMute } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmModal from '../components/ConfirmModal';
import ErrorBoundary from '../components/ErrorBoundary';
import PageHeading from '../components/PageHeading';
import PostCard from '../components/PostCard';
import ReplyEditor from '../components/ReplyEditor';
import StatusComposerModal from '../components/StatusComposerModal';
import ShortcutsHelpModal from '../components/ShortcutsHelpModal';
import ThreadToolbar from '../components/ThreadToolbar';
import { errorMessage } from '../utils/apiErrors';
import { displayStatus, statusTitle } from '../utils/status';
import { buildFlat, buildOrdered, type FlatPost, type OrderedPost } from '../utils/thread';
import { recordRecentThread } from '../utils/recentThreads';
import { getThreadSeen, markSeenAfter } from '../utils/readState';
import { scrollIntoViewMotionSafe } from '../utils/motion';
import { useCurrentUser, useThread } from '../hooks/api';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import styles from './Thread.module.css';

// Per-post boundary fallback: one malformed status renders this compact notice
// instead of crashing the whole thread. Stable module-scope element.
const POST_ERROR_FALLBACK = (
  <InlineNotification
    kind="warning"
    lowContrast
    hideCloseButton
    title="Post unavailable"
    subtitle="This post couldn't be displayed."
  />
);

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { credentials } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [replyTo, setReplyTo] = useState<mastodon.v1.Status | null>(null);
  const [editTarget, setEditTarget] = useState<mastodon.v1.Status | null>(null);
  const [postToDelete, setPostToDelete] = useState<mastodon.v1.Status | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const seenHandledRef = useRef<string | null>(null);
  const dwellCancelRef = useRef<(() => void) | null>(null);
  // Registry of rendered post <article> elements, keyed by (display) id, so
  // keyboard nav and scroll-to-unread can focus/scroll them without querying
  // the DOM.
  const postEls = useRef(new Map<string, HTMLElement>());

  const { data: currentUser } = useCurrentUser();

  const {
    threadData,
    isLoading,
    error,
    actionError,
    setActionError,
    handleAction,
    muteMutation,
    deleteMutation,
  } = useThread(id, { onRootDeleted: () => navigate('/') });

  const flat: FlatPost[] = useMemo(
    () =>
      threadData
        ? buildFlat(threadData.ancestors, threadData.mainPost, threadData.descendants)
        : [],
    [threadData],
  );
  const tree: OrderedPost[] = useMemo(
    () =>
      threadData
        ? buildOrdered(threadData.ancestors, threadData.mainPost, threadData.descendants)
        : [],
    [threadData],
  );

  const byId = useMemo(() => {
    const map = new Map<string, mastodon.v1.Status>();
    if (threadData) {
      for (const p of [
        ...threadData.ancestors,
        threadData.mainPost,
        ...threadData.descendants,
      ]) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [threadData]);

  const setPostEl = useCallback(
    (postId: string) => (el: HTMLElement | null) => {
      if (el) postEls.current.set(postId, el);
      else postEls.current.delete(postId);
    },
    [],
  );

  useEffect(() => {
    if (!threadData) return;
    const tid = threadData.mainPost.id;
    recordRecentThread(threadData.mainPost);

    // Run the read-position logic once per thread, not on every optimistic
    // cache update (which produces a fresh threadData reference).
    if (seenHandledRef.current === tid) return;
    seenHandledRef.current = tid;

    // Scroll to — and briefly highlight — the first reply we haven't seen yet.
    const prior = getThreadSeen(tid);
    if (prior && threadData.descendants.length > prior.seenReplies) {
      const firstNew = threadData.descendants[prior.seenReplies];
      if (firstNew) {
        requestAnimationFrame(() => {
          const el = postEls.current.get(firstNew.id);
          if (el) scrollIntoViewMotionSafe(el, { block: 'center' });
          setHighlightId(firstNew.id);
          setTimeout(() => setHighlightId(null), 2500);
        });
      }
    }

    // Only advance the read marker once the user has dwelled on the thread.
    dwellCancelRef.current?.();
    dwellCancelRef.current = markSeenAfter(tid, threadData.mainPost.repliesCount, 3000);
  }, [threadData]);

  useEffect(() => () => dwellCancelRef.current?.(), []);

  const scrollToComposer = useCallback(() => {
    if (composerRef.current) scrollIntoViewMotionSafe(composerRef.current, { block: 'start' });
  }, []);

  // Bring the composer into view whenever a reply target is set (Reply button or `r`).
  useEffect(() => {
    if (replyTo) scrollToComposer();
  }, [replyTo, scrollToComposer]);

  const visiblePosts = useMemo<mastodon.v1.Status[]>(() => {
    const view = settings.threadView;
    return view === 'flat' ? flat.map((f) => f.post) : tree.map((o) => o.post);
  }, [flat, tree, settings.threadView]);

  const visiblePostIds = useMemo(
    () => visiblePosts.map((p) => displayStatus(p).id),
    [visiblePosts],
  );

  const focusPost = (delta: number) => {
    const ids = visiblePostIds;
    if (ids.length === 0) return;
    const active = document.activeElement;
    let currentIndex = ids.findIndex((pid) => {
      const el = postEls.current.get(pid);
      return !!el && (el === active || el.contains(active));
    });
    if (currentIndex === -1) {
      // Nothing in a post is focused yet: start from the first card below the
      // viewport top, preserving the prior behavior.
      currentIndex = ids.findIndex((pid) => {
        const el = postEls.current.get(pid);
        return !!el && el.getBoundingClientRect().top > 100;
      });
    }
    const next = Math.max(
      0,
      Math.min(ids.length - 1, (currentIndex === -1 ? 0 : currentIndex) + delta),
    );
    const target = postEls.current.get(ids[next]);
    if (!target) return;
    target.focus({ preventScroll: false });
    scrollIntoViewMotionSafe(target, { block: 'center' });
  };

  useKeyboardShortcuts({
    j: () => focusPost(1),
    k: () => focusPost(-1),
    r: (e) => {
      e.preventDefault();
      const root = visiblePosts[0];
      if (root) setReplyTo(root);
    },
    '/': (e) => {
      e.preventDefault();
      // Reaches into the Header search input, which lives in a sibling landmark;
      // a cross-AppShell ref registry would be overkill for this one target.
      document.getElementById('header-search')?.focus();
    },
    '?': (e) => {
      e.preventDefault();
      setShortcutsOpen(true);
    },
  });

  if (!credentials) {
    return (
      <div className={styles.signedOut}>
        <PageHeading>Not signed in</PageHeading>
        <Button onClick={() => navigate('/')}>Go to sign-in</Button>
      </div>
    );
  }

  const mainTag = threadData?.mainPost.tags[0]?.name;
  const headline = threadData?.mainPost.spoilerText || 'Topic';
  const postCount = flat.length;
  const view = settings.threadView;

  return (
    <div className={styles.page}>
      <Breadcrumb noTrailingSlash className={styles.crumb}>
        <BreadcrumbItem>
          <Link to="/">Home</Link>
        </BreadcrumbItem>
        {mainTag && (
          <BreadcrumbItem>
            <Link to={`/board/${encodeURIComponent(mainTag)}`}>#{mainTag}</Link>
          </BreadcrumbItem>
        )}
        <BreadcrumbItem isCurrentPage>{threadData ? headline : 'Loading…'}</BreadcrumbItem>
      </Breadcrumb>

      <div className={styles.titleRow}>
        {threadData && (
          <h1 className={styles.title}>{statusTitle(threadData.mainPost)}</h1>
        )}
        {threadData && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={VolumeMute}
            onClick={() => muteMutation.mutate()}
            disabled={muteMutation.isPending}
            className={threadData.mainPost.muted ? styles.muted : undefined}
          >
            {threadData.mainPost.muted ? 'Unmute thread' : 'Mute thread'}
          </Button>
        )}
      </div>

      {threadData && (
        <ThreadToolbar
          postCount={postCount}
          view={view}
          onViewChange={(v) => updateSettings({ threadView: v })}
          onJumpToReply={scrollToComposer}
        />
      )}

      {isLoading && <Loading description="Loading thread" withOverlay={false} />}

      {error && (
        <InlineNotification
          kind="error"
          title="Failed to load thread"
          subtitle={errorMessage(error)}
          lowContrast
          hideCloseButton
        />
      )}

      {actionError && (
        <InlineNotification
          kind="error"
          title="Action failed"
          subtitle={actionError}
          lowContrast
          onCloseButtonClick={() => setActionError(null)}
        />
      )}

      {threadData && (
        <div className={styles.posts}>
          {view === 'flat'
            ? flat.map(({ post, quoteOf }, index) => {
                const displayId = displayStatus(post).id;
                return (
                  <ErrorBoundary key={post.id} fallback={POST_ERROR_FALLBACK}>
                    <PostCard
                      ref={setPostEl(displayId)}
                      tabIndex={-1}
                      highlighted={highlightId === displayId}
                      post={post}
                      index={index}
                      quoteOf={quoteOf}
                      ownAccountId={currentUser?.id}
                      onAction={handleAction}
                      onReplyClick={setReplyTo}
                      onEditClick={setEditTarget}
                      onDeleteClick={setPostToDelete}
                    />
                  </ErrorBoundary>
                );
              })
            : tree.map(({ post, depth }, index, arr) => {
                const prev = index > 0 ? arr[index - 1].post : null;
                const quoteOf =
                  post.inReplyToId && (!prev || prev.id !== post.inReplyToId)
                    ? byId.get(post.inReplyToId)
                    : undefined;
                const displayId = displayStatus(post).id;
                return (
                  <ErrorBoundary key={post.id} fallback={POST_ERROR_FALLBACK}>
                    <PostCard
                      ref={setPostEl(displayId)}
                      tabIndex={-1}
                      highlighted={highlightId === displayId}
                      post={post}
                      index={index}
                      depth={depth}
                      quoteOf={quoteOf}
                      ownAccountId={currentUser?.id}
                      onAction={handleAction}
                      onReplyClick={setReplyTo}
                      onEditClick={setEditTarget}
                      onDeleteClick={setPostToDelete}
                    />
                  </ErrorBoundary>
                );
              })}
        </div>
      )}

      <div ref={composerRef}>
        <ReplyEditor
          threadId={id!}
          replyTo={replyTo}
          onClearReplyTo={() => setReplyTo(null)}
        />
      </div>

      {editTarget && (
        <StatusComposerModal
          open
          onClose={() => setEditTarget(null)}
          mode={{ kind: 'edit', status: editTarget }}
        />
      )}

      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <ConfirmModal
        open={postToDelete !== null}
        heading="Delete post"
        primaryText="Delete"
        danger
        onConfirm={() => {
          if (postToDelete) deleteMutation.mutate(postToDelete);
        }}
        onClose={() => setPostToDelete(null)}
      >
        This post will be permanently deleted. This cannot be undone.
      </ConfirmModal>
    </div>
  );
}
