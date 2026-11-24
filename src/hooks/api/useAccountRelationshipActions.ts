import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../../context/AuthContext';
import { requireClient } from '../../utils/client';
import { errorMessage } from '../../utils/apiErrors';
import { purgeAccountStatuses } from '../../utils/purgeAccount';
import type { MuteOptions } from '../../components/MuteAccountModal';

interface Action {
  run: () => Promise<unknown>;
  /** Drop the account's statuses from cached timelines once the call succeeds. */
  purge: boolean;
}

interface Options {
  /** Called with the failure message, e.g. to raise a toast. */
  onError?: (message: string) => void;
}

/**
 * Mute / unmute / block / unblock (plus arbitrary follow-style calls via `run`)
 * for one account, with the cache refresh every caller needs: the account's
 * relationship and profile, the muted list, and, for mute and block, a purge of
 * its statuses from cached timelines. One mutation, so `isPending` covers all.
 */
export function useAccountRelationshipActions(
  account: Pick<mastodon.v1.Account, 'id' | 'acct'>,
  { onError }: Options = {},
) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ run }: Action) => run(),
    onMutate: () => setError(null),
    onSuccess: (_data, { purge }) => {
      queryClient.invalidateQueries({ queryKey: ['relationship', account.id] });
      queryClient.invalidateQueries({ queryKey: ['account', account.acct] });
      if (purge) purgeAccountStatuses(queryClient, account.id);
      else queryClient.invalidateQueries({ queryKey: ['mutes'] });
    },
    onError: (err) => {
      const message = errorMessage(err);
      setError(message);
      onError?.(message);
    },
  });

  const sel = () => requireClient(client).v1.accounts.$select(account.id);
  const start = (run: () => Promise<unknown>, purge = false) => mutation.mutate({ run, purge });

  return {
    isPending: mutation.isPending,
    error,
    /** Run any other relationship call (follow, domain block, report) with the shared refresh. */
    run: (fn: () => Promise<unknown>) => start(fn),
    mute: (options: MuteOptions) => start(() => sel().mute(options), true),
    unmute: () => start(() => sel().unmute()),
    block: () => start(() => sel().block(), true),
    unblock: () => start(() => sel().unblock()),
  };
}
