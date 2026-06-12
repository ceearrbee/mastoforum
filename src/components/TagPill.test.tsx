import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TagPill from './TagPill';

describe('TagPill', () => {
  it('links to the encoded board route', () => {
    render(
      <MemoryRouter>
        <TagPill name="sci fi" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/board/sci%20fi');
  });
});
