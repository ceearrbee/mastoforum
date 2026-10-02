import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ThreadToolbar from './ThreadToolbar';

function renderToolbar(overrides: Partial<Parameters<typeof ThreadToolbar>[0]> = {}) {
  const props = {
    postCount: 4,
    view: 'flat' as const,
    onViewChange: vi.fn(),
    onJumpToReply: vi.fn(),
    unreadCount: 3,
    onMarkRead: vi.fn(),
    allCollapsed: false,
    onToggleCollapseAll: vi.fn(),
    ...overrides,
  };
  render(<ThreadToolbar {...props} />);
  return props;
}

describe('ThreadToolbar collapse-all control', () => {
  it('offers "Collapse all" while any post is expanded', () => {
    const { onToggleCollapseAll } = renderToolbar({ allCollapsed: false });
    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(onToggleCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('offers "Expand all" once everything is collapsed', () => {
    const { onToggleCollapseAll } = renderToolbar({ allCollapsed: true });
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(onToggleCollapseAll).toHaveBeenCalledTimes(1);
  });
});

describe('ThreadToolbar mark-read control', () => {
  it('shows an enabled "Mark read" button when there are unread replies', () => {
    const { onMarkRead } = renderToolbar({ unreadCount: 3 });
    const button = screen.getByRole('button', { name: /mark read/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled "All read" state when nothing is unread', () => {
    const { onMarkRead } = renderToolbar({ unreadCount: 0 });
    const button = screen.getByRole('button', { name: /all read/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onMarkRead).not.toHaveBeenCalled();
  });
});

describe('ThreadToolbar sync remote control', () => {
  it('does not render sync button when onSyncRemote is undefined', () => {
    renderToolbar({ onSyncRemote: undefined });
    expect(screen.queryByRole('button', { name: /sync/i })).toBeNull();
  });

  it('renders enabled sync button and triggers callback on click', () => {
    const onSyncRemote = vi.fn();
    renderToolbar({ onSyncRemote, isSyncingRemote: false });
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Sync');
    fireEvent.click(button);
    expect(onSyncRemote).toHaveBeenCalledTimes(1);
  });

  it('renders disabled syncing button while isSyncingRemote is true', () => {
    const onSyncRemote = vi.fn();
    renderToolbar({ onSyncRemote, isSyncingRemote: true });
    const button = screen.getByRole('button', { name: /syncing/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSyncRemote).not.toHaveBeenCalled();
  });
});

