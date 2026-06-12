import { describe, expect, it, vi } from 'vitest';
import { onToast, pushToast, type Toast } from './toast';

describe('toast bus', () => {
  it('delivers pushed toasts to subscribers', () => {
    const received: Toast[] = [];
    const unsub = onToast((t) => received.push(t));

    pushToast({ kind: 'error', title: 'Boom', subtitle: 'details' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ kind: 'error', title: 'Boom', subtitle: 'details' });
    expect(typeof received[0].id).toBe('number');

    unsub();
  });

  it('assigns a unique id to each toast', () => {
    const ids: number[] = [];
    const unsub = onToast((t) => ids.push(t.id));

    pushToast({ kind: 'info', title: 'one' });
    pushToast({ kind: 'info', title: 'two' });

    expect(ids[0]).not.toBe(ids[1]);
    unsub();
  });

  it('stops delivering after unsubscribe', () => {
    const handler = vi.fn();
    const unsub = onToast(handler);
    unsub();

    pushToast({ kind: 'success', title: 'ignored' });

    expect(handler).not.toHaveBeenCalled();
  });
});
