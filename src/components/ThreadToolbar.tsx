/*
 * The view toggle is a segmented control: a role="group" of aria-pressed buttons.
 * <fieldset> (the prefer-native-tag suggestion) is for form field grouping and
 * brings UA chrome that doesn't fit a button toolbar, so the role is intentional.
 */
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
        {/* role="group" is the right semantic for a toggle-button set; the
            suggested native tags (fieldset etc.) are form-field containers. */}
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
