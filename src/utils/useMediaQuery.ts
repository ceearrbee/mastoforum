import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string, ssrDefault = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => ssrDefault,
  );
}
