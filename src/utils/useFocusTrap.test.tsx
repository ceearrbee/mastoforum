import { describe, expect, it, beforeEach } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useFocusTrap } from './useFocusTrap';

function Trapped({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref} tabIndex={-1} data-testid="trap">
      <button>first</button>
      <button>middle</button>
      <button>last</button>
    </div>
  );
}

function Toggleable() {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <>
      <button onClick={() => setActive(true)}>open</button>
      {active && (
        <div ref={ref} tabIndex={-1}>
          <button onClick={() => setActive(false)}>close</button>
        </div>
      )}
    </>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first focusable element on activation', () => {
    render(<Trapped active />);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('wraps focus from the last element to the first on Tab', () => {
    render(<Trapped active />);
    const trap = screen.getByTestId('trap');
    screen.getByRole('button', { name: 'last' }).focus();
    fireEvent.keyDown(trap, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  it('wraps focus from the first element to the last on Shift+Tab', () => {
    render(<Trapped active />);
    const trap = screen.getByTestId('trap');
    screen.getByRole('button', { name: 'first' }).focus();
    fireEvent.keyDown(trap, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
  });

  it('restores focus to the trigger when deactivated', () => {
    render(<Toggleable />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    // Trap is active; the close button inside it receives focus.
    expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    // Deactivated; focus returns to the opener.
    expect(opener).toHaveFocus();
  });
});
