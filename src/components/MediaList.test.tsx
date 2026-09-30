import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { mastodon } from 'masto';
import MediaList from './MediaList';

function imageAttachment(overrides: Partial<mastodon.v1.MediaAttachment> = {}): mastodon.v1.MediaAttachment {
  return {
    id: 'm1',
    type: 'image',
    previewUrl: 'https://img.example/preview1.jpg',
    url: 'https://img.example/full1.jpg',
    description: 'First photo',
    meta: {},
    ...overrides,
  } as mastodon.v1.MediaAttachment;
}

describe('MediaList inline lightbox', () => {
  it('renders image thumbnail as a button with alt description', () => {
    render(<MediaList media={[imageAttachment()]} />);

    const img = screen.getByRole('img', { name: 'First photo' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.example/preview1.jpg');

    const button = screen.getByRole('button', { name: 'First photo' });
    expect(button).toBeInTheDocument();
  });

  it('opens lightbox modal inline when clicking an image thumbnail', () => {
    render(<MediaList media={[imageAttachment()]} />);

    // Before click, modal content is not in document
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click thumbnail button
    fireEvent.click(screen.getByRole('button', { name: 'First photo' }));

    // Modal dialog is now open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Full-resolution image is shown inside the dialog
    const modalImages = screen.getAllByRole('img', { name: 'First photo' });
    const fullImg = modalImages.find((el) => el.getAttribute('src') === 'https://img.example/full1.jpg');
    expect(fullImg).toBeDefined();

    // "Open original" link is present with target="_blank"
    const originalLink = screen.getByRole('link', { name: 'Open original' });
    expect(originalLink).toHaveAttribute('href', 'https://img.example/full1.jpg');
    expect(originalLink).toHaveAttribute('target', '_blank');

    // Close button dismisses modal
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('supports cycling through multiple images via Next/Previous buttons and arrow keys', () => {
    const images = [
      imageAttachment({ id: 'm1', url: 'https://img.example/full1.jpg', description: 'First photo' }),
      imageAttachment({ id: 'm2', url: 'https://img.example/full2.jpg', description: 'Second photo' }),
    ];

    render(<MediaList media={images} />);

    // Open first image
    fireEvent.click(screen.getByRole('button', { name: 'First photo' }));

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('First photo', { selector: 'p' })).toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Second photo', { selector: 'p' })).toBeInTheDocument();

    // Click Prev
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('First photo', { selector: 'p' })).toBeInTheDocument();

    // Press ArrowRight keyboard shortcut
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 of 2')).toBeInTheDocument();

    // Press ArrowLeft keyboard shortcut
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('renders video and audio attachments without lightbox buttons', () => {
    const mixed = [
      { id: 'v1', type: 'video', url: 'https://vid.example/v.mp4', description: 'Sample video' } as mastodon.v1.MediaAttachment,
      { id: 'a1', type: 'audio', url: 'https://aud.example/a.mp3', description: 'Sample audio' } as mastodon.v1.MediaAttachment,
    ];

    const { container } = render(<MediaList media={mixed} />);

    expect(container.querySelector('video')).toHaveAttribute('src', 'https://vid.example/v.mp4');
    expect(container.querySelector('audio')).toHaveAttribute('src', 'https://aud.example/a.mp3');
  });
});
