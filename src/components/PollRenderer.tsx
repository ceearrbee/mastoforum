import { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { errorMessage } from '../utils/apiErrors';
import styles from './PollRenderer.module.css';

interface Props {
  poll: mastodon.v1.Poll;
  statusId: string;
}

export default function PollRenderer({ poll, statusId }: Props) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');

  const expired = poll.expired;
  const already = poll.voted || expired;
  const total = poll.votesCount || 1;

  const voteMutation = useMutation({
    mutationFn: async () => requireClient(client).v1.polls.$select(poll.id).votes.create({ choices: selected }),
    onSuccess: () => {
      void statusId;
      queryClient.invalidateQueries({ queryKey: ['thread'] });
    },
    onError: (err: unknown) =>
      setError(errorMessage(err, 'Could not submit vote')),
  });

  const toggle = (idx: number) => {
    if (poll.multiple) {
      setSelected((s) => (s.includes(idx) ? s.filter((v) => v !== idx) : [...s, idx]));
    } else {
      setSelected([idx]);
    }
  };

  return (
    <div className={styles.poll}>
      {poll.options.map((option, idx) => {
        const ownVote = poll.ownVotes?.includes(idx);
        const pct = Math.round(((option.votesCount ?? 0) / total) * 100);
        return (
          <label
            key={idx}
            className={`${styles.option} ${ownVote ? styles.voted : ''}`}
          >
            {already && (
              <span
                className={styles.optionBar}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            )}
            {!already && (
              <input
                type={poll.multiple ? 'checkbox' : 'radio'}
                name={`poll-${poll.id}`}
                aria-label={option.title}
                checked={selected.includes(idx)}
                onChange={() => toggle(idx)}
              />
            )}
            <span className={styles.optionLabel}>{option.title}</span>
            {already && <span className={styles.optionPct}>{pct}%</span>}
          </label>
        );
      })}

      {!already && (
        <Button
          kind="primary"
          size="sm"
          onClick={() => voteMutation.mutate()}
          disabled={selected.length === 0 || voteMutation.isPending}
        >
          {voteMutation.isPending ? 'Submitting…' : 'Vote'}
        </Button>
      )}

      <div className={styles.footer}>
        <span>{poll.votesCount} votes</span>
        {poll.expiresAt && (
          <span>
            {expired
              ? 'Closed'
              : `Closes ${new Date(poll.expiresAt).toLocaleString()}`}
          </span>
        )}
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Vote failed"
          subtitle={error}
          lowContrast
          onCloseButtonClick={() => setError('')}
        />
      )}
    </div>
  );
}
