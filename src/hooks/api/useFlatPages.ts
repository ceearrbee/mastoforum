import { useMemo } from 'react';
import type { InfiniteData } from '@tanstack/react-query';

/**
 * Flatten an infinite query's page array into a single memoized list, replacing
 * the `useMemo(() => data ? data.pages.flat() : [], [data])` repeated across pages.
 */
export function useFlatPages<T>(data: InfiniteData<T[]> | undefined): T[] {
  return useMemo(() => (data ? data.pages.flat() : []), [data]);
}
