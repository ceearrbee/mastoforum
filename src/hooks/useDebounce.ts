import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after `delayMs` of quiet — i.e. it
 * lags behind rapid changes and settles once they stop. Use it to throttle
 * expensive reactions to fast-changing input (live search, autosave) without
 * hand-rolling `setTimeout`/`clearTimeout` in an effect at each call site.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
