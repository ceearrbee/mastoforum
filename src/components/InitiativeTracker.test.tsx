import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InitiativeTracker from './InitiativeTracker';

const entries = [
  { statusId: 's1', name: 'Grond', roll: 20, acct: 'grond@rpg' },
  { statusId: 's2', name: 'Vex', roll: 17, acct: 'vex@rpg' },
  { statusId: 's3', name: 'Goblin', roll: 12, acct: 'gm@rpg' },
];

describe('InitiativeTracker', () => {
  it('does not render if fewer than 2 entries exist', () => {
    const { container } = render(<InitiativeTracker entries={[entries[0]]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders initiative participants in order', () => {
    render(<InitiativeTracker entries={entries} />);
    expect(screen.getByRole('region', { name: /combat initiative tracker/i })).toBeInTheDocument();
    expect(screen.getByText('Grond')).toBeInTheDocument();
    expect(screen.getByText('Vex')).toBeInTheDocument();
    expect(screen.getByText('Goblin')).toBeInTheDocument();
  });

  it('advances active turn on next turn click', () => {
    render(<InitiativeTracker entries={entries} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).not.toHaveAttribute('aria-current');

    fireEvent.click(screen.getByRole('button', { name: /next turn/i }));
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');

    // Loops around after last
    fireEvent.click(screen.getByRole('button', { name: /next turn/i }));
    fireEvent.click(screen.getByRole('button', { name: /next turn/i }));
    expect(items[0]).toHaveAttribute('aria-current', 'step');
  });
});
