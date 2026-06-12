import { InlineLoading, InlineNotification, Modal } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { errorMessage } from '../utils/apiErrors';
import SanitizedHtml from './SanitizedHtml';
import styles from './EditHistoryModal.module.css';

interface Props {
  statusId: string | null;
  open: boolean;
  onClose: () => void;
}

/** Lists a status's edit history (sanitised content per version, no diff). */
export default function EditHistoryModal({ statusId, open, onClose }: Props) {
  const { client } = useAuth();

  const { data, isLoading, error } = useQuery<mastodon.v1.StatusEdit[]>({
    queryKey: ['statusHistory', statusId],
    queryFn: async () => await requireClient(client).v1.statuses.$select(statusId!).history.list(),
    enabled: open && !!client && !!statusId,
    staleTime: 60_000,
  });

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Edit history"
      primaryButtonText="Close"
      onRequestSubmit={onClose}
      passiveModal
      size="md"
    >
      {isLoading && <InlineLoading description="Loading history…" />}
      {error && (
        <InlineNotification
          kind="error"
          title="Could not load history"
          subtitle={errorMessage(error, 'Unknown error')}
          lowContrast
          hideCloseButton
        />
      )}
      {data && data.length > 0 && (
        <ol className={styles.list}>
          {data.map((edit, idx) => (
            <li key={idx} className={styles.entry}>
              <div className={styles.stamp}>
                <span className={styles.version}>
                  {idx === 0 ? 'Original' : `Edit ${idx}`}
                </span>
                <time dateTime={edit.createdAt}>
                  {new Date(edit.createdAt).toLocaleString()}
                </time>
              </div>
              {edit.spoilerText && <p className={styles.spoiler}>{edit.spoilerText}</p>}
              <SanitizedHtml
                className={`${styles.body} post-content`}
                html={edit.content}
                emojis={edit.emojis}
              />
            </li>
          ))}
        </ol>
      )}
      {data && data.length === 0 && <p>No edit history available.</p>}
    </Modal>
  );
}
