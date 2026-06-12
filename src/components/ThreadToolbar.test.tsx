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
    ...overrides,
  };
  render(<ThreadToolbar {...props} />);
  return props;
}

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
