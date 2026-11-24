import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStreamingAPIClient } from 'masto';
import { openUserStream } from './streaming';

vi.mock('masto', () => ({ createStreamingAPIClient: vi.fn() }));

interface FakeEvent {
  event: string;
  payload: unknown;
}

/** A subscription whose events the test pushes by hand. */
function fakeStream() {
  const queue: FakeEvent[] = [];
  let wake: (() => void) | null = null;
  let failure: unknown = null;
  const poke = () => wake?.();
  const unsubscribe = vi.fn();
  const close = vi.fn();
  const subscription = {
    unsubscribe,
    async *[Symbol.asyncIterator]() {
      for (;;) {
        const next = queue.shift();
        if (next) {
          yield next;
          continue;
        }
        if (failure) throw failure;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
    },
  };
  const client = { user: { subscribe: () => subscription }, close };
  return {
    client,
    unsubscribe,
    close,
    push(event: string, payload: unknown) {
      queue.push({ event, payload });
      poke();
    },
    fail(err: unknown) {
      failure = err;
      poke();
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const options = { streamingApiUrl: 'wss://stream.example', accessToken: 'tok' };
const createClient = vi.mocked(createStreamingAPIClient);

beforeEach(() => {
  createClient.mockReset();
});

describe('openUserStream', () => {
  it('opens the stream with the given url and token', () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    openUserStream(options, {});
    expect(createClient).toHaveBeenCalledWith({
      streamingApiUrl: 'wss://stream.example',
      accessToken: 'tok',
    });
  });

  it('forwards update and status.update payloads to onUpdate', async () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    const onUpdate = vi.fn();
    openUserStream(options, { onUpdate });

    stream.push('update', { id: 'a' });
    stream.push('status.update', { id: 'b' });

    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2));
    expect(onUpdate).toHaveBeenNthCalledWith(1, { id: 'a' });
    expect(onUpdate).toHaveBeenNthCalledWith(2, { id: 'b' });
  });

  it('forwards the status id of a delete event to onDelete', async () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    const onDelete = vi.fn();
    openUserStream(options, { onDelete });

    stream.push('delete', '123');

    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledWith('123'));
  });

  it('ignores other event types and missing handlers', async () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    openUserStream(options, { onUpdate, onDelete });

    stream.push('notification', { id: 'n' });
    stream.push('delete', '9');
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(onUpdate).not.toHaveBeenCalled();

    const bare = fakeStream();
    createClient.mockReturnValue(bare.client as never);
    openUserStream(options, {});
    bare.push('update', { id: 'x' });
    await flush();
  });

  it('stops forwarding and tears the stream down on cleanup', async () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    const onUpdate = vi.fn();
    const stop = openUserStream(options, { onUpdate });

    stop();
    expect(stream.unsubscribe).toHaveBeenCalledTimes(1);
    expect(stream.close).toHaveBeenCalledTimes(1);

    stream.push('update', { id: 'late' });
    await flush();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('returns a no-op when the socket cannot be created', () => {
    createClient.mockImplementation(() => {
      throw new Error('no websocket');
    });
    const stop = openUserStream(options, {});
    expect(() => stop()).not.toThrow();
  });

  it('returns a no-op when subscribing throws', () => {
    createClient.mockReturnValue({
      user: {
        subscribe: () => {
          throw new Error('refused');
        },
      },
      close: vi.fn(),
    } as never);
    const stop = openUserStream(options, {});
    expect(() => stop()).not.toThrow();
  });

  it('survives the socket dropping mid-stream', async () => {
    const stream = fakeStream();
    createClient.mockReturnValue(stream.client as never);
    const onUpdate = vi.fn();
    const stop = openUserStream(options, { onUpdate });

    // An unhandled rejection here would fail the whole vitest run.
    stream.fail(new Error('socket dropped'));
    await flush();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('swallows errors from closing an already closed stream', () => {
    const stream = fakeStream();
    stream.unsubscribe.mockImplementation(() => {
      throw new Error('already closed');
    });
    createClient.mockReturnValue(stream.client as never);
    const stop = openUserStream(options, {});
    expect(() => stop()).not.toThrow();
  });
});
