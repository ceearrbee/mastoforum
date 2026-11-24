import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import ConfirmModal from './ConfirmModal';
import MuteAccountModal from './MuteAccountModal';
import { useAccountRelationshipActions } from '../hooks/api/useAccountRelationshipActions';
import { domainOf } from '../utils/handles';
import { useCurrentUser } from '../utils/queries';
import styles from './AccountActionMenu.module.css';

interface Props {
  account: Pick<mastodon.v1.Account, 'id' | 'acct'>;
  /** Render the primary Follow/Following button alongside the overflow menu. */
  showFollowButton?: boolean;
  /** Carbon size for the controls. */
  size?: 'sm' | 'md' | 'lg';
}

/** Follow/unfollow + mute/block/report for one account; renders nothing for your own. */
export default function AccountActionMenu({ account, showFollowButton = true, size = 'md' }: Props) {
  const { client } = useAuth();
  const [confirmReport, setConfirmReport] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);

  const { data: currentUser } = useCurrentUser();

  const relationshipKey = ['relationship', account.id];
  const { data: relationship } = useQuery<mastodon.v1.Relationship | null>({
    queryKey: relationshipKey,
    queryFn: async () => {
      const rels = await requireClient(client).v1.accounts.relationships.fetch({ id: [account.id] });
      return rels[0] ?? null;
    },
    enabled: !!client && !!account.id,
  });

  const domain = domainOf(account.acct);

  const actions = useAccountRelationshipActions(account);
  const { error, isPending } = actions;

  // Don't offer actions on your own account.
  if (currentUser && currentUser.id === account.id) return null;

  const run = (fn: () => Promise<unknown>) => () => actions.run(fn);
  const sel = () => requireClient(client).v1.accounts.$select(account.id);

  const following = relationship?.following ?? false;
  const requested = relationship?.requested ?? false;
  const muting = relationship?.muting ?? false;
  const blocking = relationship?.blocking ?? false;
  const domainBlocking = relationship?.domainBlocking ?? false;

  let followLabel = 'Follow';
  if (following) followLabel = 'Following';
  else if (requested) followLabel = 'Requested';

  return (
    <div className={styles.wrap}>
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}

      {showFollowButton && (
        <Button
          kind={following || requested ? 'tertiary' : 'primary'}
          size={size}
          disabled={!relationship || isPending}
          onClick={run(() => (following || requested ? sel().unfollow() : sel().follow()))}
        >
          {followLabel}
        </Button>
      )}

      <OverflowMenu
        size={size}
        aria-label="Account actions"
        iconDescription="Account actions"
        flipped
      >
        <OverflowMenuItem
          itemText={muting ? 'Unmute' : 'Mute'}
          onClick={() => (muting ? actions.unmute() : setMuteOpen(true))}
        />
        <OverflowMenuItem
          itemText={blocking ? 'Unblock' : 'Block'}
          isDelete={!blocking}
          onClick={() => (blocking ? actions.unblock() : actions.block())}
        />
        {domain && (
          <OverflowMenuItem
            hasDivider
            itemText={domainBlocking ? `Unblock ${domain}` : `Block ${domain}`}
            isDelete={!domainBlocking}
            onClick={run(() =>
              domainBlocking
                ? requireClient(client).v1.domainBlocks.remove({ domain })
                : requireClient(client).v1.domainBlocks.create({ domain }),
            )}
          />
        )}
        <OverflowMenuItem
          hasDivider
          isDelete
          itemText="Report"
          onClick={() => setConfirmReport(true)}
        />
      </OverflowMenu>

      <MuteAccountModal
        open={muteOpen}
        acct={account.acct}
        onConfirm={actions.mute}
        onClose={() => setMuteOpen(false)}
      />

      <ConfirmModal
        open={confirmReport}
        heading="Report account"
        primaryText="Report"
        danger
        onConfirm={() =>
          actions.run(() => requireClient(client).v1.reports.create({ accountId: account.id }))
        }
        onClose={() => setConfirmReport(false)}
      >
        Report @{account.acct} to the moderators of your instance?
      </ConfirmModal>
    </div>
  );
}
