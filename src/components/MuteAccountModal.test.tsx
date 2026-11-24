import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MuteAccountModal from './MuteAccountModal';

function setup() {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<MuteAccountModal open acct="bob@elsewhere.social" onConfirm={onConfirm} onClose={onClose} />);
  return { onConfirm, onClose };
}

describe('MuteAccountModal', () => {
  it('names the account being muted', () => {
    setup();
    expect(screen.getByText('Mute @bob@elsewhere.social')).toBeInTheDocument();
  });

  it('offers the eight durations, seconds as values, indefinite first and selected', () => {
    setup();
    const select = screen.getByLabelText('Duration') as HTMLSelectElement;
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => [o.textContent, o.value])).toEqual([
      ['Indefinite', '0'],
      ['5 minutes', '300'],
      ['30 minutes', '1800'],
      ['1 hour', '3600'],
      ['6 hours', '21600'],
      ['1 day', '86400'],
      ['3 days', '259200'],
      ['7 days', '604800'],
    ]);
    expect(select.value).toBe('0');
  });

  it('hides notifications by default', () => {
    setup();
    expect(screen.getByLabelText('Hide notifications from this account')).toBeChecked();
  });

  it('confirms with indefinite duration and notifications hidden by default', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(onConfirm).toHaveBeenCalledWith({ duration: 0, notifications: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('confirms with the chosen duration and notifications option', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '3600' } });
    fireEvent.click(screen.getByLabelText('Hide notifications from this account'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(onConfirm).toHaveBeenCalledWith({ duration: 3600, notifications: false });
  });

  it('cancels without muting', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders under document.body, outside a clipping ancestor', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', containerType: 'inline-size' }}>
        <MuteAccountModal open acct="bob@elsewhere.social" onConfirm={vi.fn()} onClose={vi.fn()} />
      </div>,
    );
    expect(container.querySelector('.cds--modal')).toBeNull();
    expect(document.body.querySelector(':scope > .cds--modal')).not.toBeNull();
  });
});
