import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharCounter from './CharCounter';

describe('CharCounter', () => {
  it('shows the remaining character budget', () => {
    render(<CharCounter remaining={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows a negative number when over the limit', () => {
    render(<CharCounter remaining={-3} />);
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('marks itself over-limit for styling when remaining is negative', () => {
    const { container } = render(<CharCounter remaining={-1} />);
    expect(container.querySelector('[data-over="true"]')).not.toBeNull();
  });

  it('is not over-limit when budget remains', () => {
    const { container } = render(<CharCounter remaining={5} />);
    expect(container.querySelector('[data-over="true"]')).toBeNull();
  });
});
