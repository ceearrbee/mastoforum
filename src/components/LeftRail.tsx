import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { clearRecentThreads, useRecentThreads } from '../utils/recentThreads';
import { useFollowedTags } from '../utils/queries';
import ConfirmModal from './ConfirmModal';
import ListsManagerModal from './ListsManagerModal';
import styles from './LeftRail.module.css';

interface Props {
  onNavigate?: () => void;
}

export default function LeftRail({ onNavigate }: Props) {
  const { client, credentials } = useAuth();
  const recents = useRecentThreads();
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const { data: followedTags = [] } = useFollowedTags();

  const { data: lists = [] } = useQuery<mastodon.v1.List[]>({
    queryKey: ['lists'],
    queryFn: async () => await requireClient(client).v1.lists.list(),
    enabled: !!client,
  });

  if (!credentials) return null;

  return (
    <nav className={styles.rail} aria-label="Forum sections">
      <section className={styles.section}>
        <ul className={styles.list}>
          <li>
            <NavLink to="/messages" className={styles.link} onClick={onNavigate}>
              Messages
            </NavLink>
          </li>
          <li>
            <NavLink to="/follow-requests" className={styles.link} onClick={onNavigate}>
              Follow requests
            </NavLink>
          </li>
          <li>
            <NavLink to="/scheduled" className={styles.link} onClick={onNavigate}>
              Scheduled posts
            </NavLink>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading}>Recent threads</h2>
          {recents.length > 0 && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setClearHistoryOpen(true)}
            >
              Clear
            </button>
          )}
        </div>
        {recents.length === 0 ? (
          <p className={styles.empty}>Open a thread to see it here.</p>
        ) : (
          <ul className={styles.list}>
            {recents.slice(0, 10).map((t) => (
              <li key={t.id}>
                <NavLink
                  to={`/thread/${encodeURIComponent(t.id)}`}
                  className={styles.link}
                  onClick={onNavigate}
                  title={t.title}
                >
                  <span className={styles.threadTitle}>{t.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading}>Lists</h2>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setListsModalOpen(true)}
          >
            Manage
          </button>
        </div>
        {lists.length === 0 ? (
          <p className={styles.empty}>No lists yet.</p>
        ) : (
          <ul className={styles.list}>
            {lists.map((list) => (
              <li key={list.id}>
                <NavLink
                  to={`/list/${encodeURIComponent(list.id)}`}
                  className={styles.link}
                  onClick={onNavigate}
                >
                  <span className={styles.threadTitle}>{list.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Followed tags</h2>
        {followedTags.length === 0 ? (
          <p className={styles.empty}>You're not following any tags yet.</p>
        ) : (
          <ul className={styles.list}>
            {followedTags.map((tag) => (
              <li key={tag.name}>
                <NavLink
                  to={`/board/${encodeURIComponent(tag.name)}`}
                  className={styles.link}
                  onClick={onNavigate}
                >
                  <span className={styles.tag}>#{tag.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ListsManagerModal open={listsModalOpen} onClose={() => setListsModalOpen(false)} />

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
    </nav>
  );
}
