// The view toggle is a segmented control: a role="group" of aria-pressed buttons.
import { Button } from '@carbon/react';
import { Checkmark, ChevronDown } from '@carbon/icons-react';
import type { ThreadView } from '../context/SettingsContext';
import styles from './ThreadToolbar.module.css';

interface Props {
  postCount: number;
  view: ThreadView;
  onViewChange: (view: ThreadView) => void;
  onJumpToReply: () => void;
  unreadCount: number;
  onMarkRead: () => void;
}

export default function ThreadToolbar({
  postCount,
  view,
  onViewChange,
  onJumpToReply,
  unreadCount,
  onMarkRead,
}: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Thread view controls">
      <div className={styles.meta}>
        {postCount} {postCount === 1 ? 'post' : 'posts'}
      </div>
      <div className={styles.right}>
        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div className={styles.viewToggle} role="group" aria-label="Thread view">
          <button
            type="button"
            className={styles.viewPill}
            aria-pressed={view === 'flat'}
            onClick={() => onViewChange('flat')}
          >
            Flat
          </button>
          <button
            type="button"
            className={styles.viewPill}
            aria-pressed={view === 'tree'}
            onClick={() => onViewChange('tree')}
          >
            Tree
          </button>
        </div>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Checkmark}
          disabled={unreadCount === 0}
          onClick={onMarkRead}
        >
          {unreadCount === 0 ? 'All read' : 'Mark read'}
        </Button>
        <Button kind="ghost" size="sm" renderIcon={ChevronDown} onClick={onJumpToReply}>
          Reply
        </Button>
      </div>
    </div>
  );
}
