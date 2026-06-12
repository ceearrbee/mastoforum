import type { ReactNode } from 'react';
import { InlineNotification } from '@carbon/react';
import SkeletonList from './Skeleton';
import LoadMoreButton from './LoadMoreButton';
import { errorMessage } from '../utils/apiErrors';

interface Props {
  /** The flattened items, used for the empty-state check. */
  items: readonly unknown[];
  isLoading: boolean;
  error: unknown;
  /** Title for the error notification. */
  errorTitle: string;
  emptyMessage: string;
  /** Class applied to the empty-state `<p>` so each page keeps its own styling. */
  emptyClassName?: string;
  skeletonRows?: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** The rendered list markup (the page owns per-item rendering). */
  children: ReactNode;
}

/**
 * Renders the skeleton / error / empty / load-more chrome shared by every
 * paginated page, wrapping the page's own list markup. Keeps the previously
 * copy-pasted state blocks in one place.
 */
export default function PaginatedList({
  items,
  isLoading,
  error,
  errorTitle,
  emptyMessage,
  emptyClassName,
  skeletonRows = 5,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  children,
}: Props) {
  return (
    <>
      {isLoading && <SkeletonList rows={skeletonRows} />}

      {error != null && (
        <InlineNotification
          kind="error"
          title={errorTitle}
          subtitle={errorMessage(error)}
          lowContrast
          hideCloseButton
        />
      )}

      {!isLoading && items.length === 0 && (
        <p className={emptyClassName}>{emptyMessage}</p>
      )}

      {children}

      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}
