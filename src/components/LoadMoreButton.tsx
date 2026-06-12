import { Button } from '@carbon/react';
import styles from './LoadMoreButton.module.css';

interface Props {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export default function LoadMoreButton({ hasNextPage, isFetchingNextPage, fetchNextPage }: Props) {
  if (!hasNextPage) return null;
  return (
    <div className={styles.wrap}>
      <Button
        kind="ghost"
        size="md"
        onClick={() => void fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading…' : 'Load more'}
      </Button>
    </div>
  );
}
