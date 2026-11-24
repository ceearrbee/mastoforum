import { useRef, useState } from 'react';
import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { useAccountRelationshipActions } from '../hooks/api/useAccountRelationshipActions';
import { useCurrentUser } from '../utils/queries';
import { pushToast } from '../utils/toast';
import MuteAccountModal from './MuteAccountModal';

interface Props {
  account: Pick<mastodon.v1.Account, 'id' | 'acct'>;
}

/**
 * Post-header overflow menu with "Mute @acct". Hidden for your own posts and until
 * your account has loaded, so it never flashes on them. The dialog mounts only
 * when opened: a thread can hold hundreds of cards.
 */
export default function PostAccountMenu({ account }: Props) {
  const { client } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const [muteOpen, setMuteOpen] = useState(false);
  // Carbon types this ref as a div; at runtime it is the trigger button.
  const triggerRef = useRef<HTMLDivElement>(null);
  const actions = useAccountRelationshipActions(account, {
    onError: (message) =>
      pushToast({ kind: 'error', title: `Failed to mute @${account.acct}`, subtitle: message }),
  });

  if (!client || !currentUser || currentUser.id === account.id) return null;

  const label = `Actions for @${account.acct}`;
  // The dialog unmounts on close, so hand focus back to the menu button ourselves.
  const closeDialog = () => {
    setMuteOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <OverflowMenu ref={triggerRef} size="sm" aria-label={label} iconDescription={label} flipped>
        <OverflowMenuItem itemText={`Mute @${account.acct}`} onClick={() => setMuteOpen(true)} />
      </OverflowMenu>
      {muteOpen && (
        <MuteAccountModal
          open
          acct={account.acct}
          onConfirm={actions.mute}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
