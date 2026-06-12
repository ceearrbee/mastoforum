import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AvatarChip from './AvatarChip';

describe('AvatarChip', () => {
  it('renders an initial when no avatar URL is given', () => {
    render(<AvatarChip account={{ displayName: 'Ada', username: 'ada' }} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('uppercases the fallback character', () => {
    render(<AvatarChip account={{ displayName: 'badger', username: 'badger' }} />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders an image when an avatar URL is present', () => {
    render(
      <AvatarChip
        account={{ avatar: 'https://example.com/a.png', displayName: 'Ada', username: 'ada' }}
      />,
    );
    const img = screen.getByRole('presentation', { hidden: true }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toBe('https://example.com/a.png');
  });

  it('falls back to initial when the image errors', () => {
    render(
      <AvatarChip
        account={{ avatar: 'https://example.com/missing.png', displayName: 'Ada', username: 'ada' }}
      />,
    );
    const img = screen.getByRole('presentation', { hidden: true });
    fireEvent.error(img);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
