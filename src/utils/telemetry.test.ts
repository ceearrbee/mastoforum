import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportError, setErrorReporter } from './telemetry';

afterEach(() => {
  setErrorReporter(null);
  vi.restoreAllMocks();
});

describe('reportError', () => {
  it('forwards the error and context to a registered reporter', () => {
    const sink = vi.fn();
    setErrorReporter(sink);
    const err = new Error('boom');
    reportError(err, { source: 'react', componentStack: 'x' });
    expect(sink).toHaveBeenCalledWith(err, { source: 'react', componentStack: 'x' });
  });

  it('never throws even if the reporter itself throws', () => {
    setErrorReporter(() => {
      throw new Error('reporter exploded');
    });
    expect(() => reportError(new Error('x'), { source: 'window' })).not.toThrow();
  });

  it('is a safe no-op when no reporter is registered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => reportError(new Error('x'), { source: 'query' })).not.toThrow();
  });
});
