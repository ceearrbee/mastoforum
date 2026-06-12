import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InlineNotification } from '@carbon/react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { errorMessage } from '../utils/apiErrors';
import SuggestionCard from './SuggestionCard';
import styles from './WhoToFollow.module.css';

/** Home "who to follow" from `v2.suggestions`; dismiss removes server-side, empty hides the section. */
export default function WhoToFollow() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data = [], error, isLoading } = useQuery<mastodon.v1.Suggestion[]>({
    queryKey: ['suggestions'],
    queryFn: async () => await requireClient(client).v2.suggestions.list({ limit: 3 }),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => requireClient(client).v1.suggestions.$select(id).remove(id),
    onMutate: (id: string) => {
      setDismissed((prev) => new Set(prev).add(id));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const visible = data.filter((s) => !dismissed.has(s.account.id));

  if (isLoading) return null;

  if (error) {
    return (
      <section className={styles.section} aria-label="Who to follow">
        <h2 className={styles.heading}>Who to follow</h2>
        <InlineNotification
          kind="warning"
          title="Suggestions unavailable"
          subtitle={errorMessage(error)}
          lowContrast
          hideCloseButton
        />
      </section>
    );
  }

  if (visible.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Who to follow">
      <h2 className={styles.heading}>Who to follow</h2>
      <div className={styles.grid}>
        {visible.map((suggestion) => (
          <SuggestionCard
            key={suggestion.account.id}
            suggestion={suggestion}
            onDismiss={() => dismiss.mutate(suggestion.account.id)}
          />
        ))}
      </div>
    </section>
  );
}
