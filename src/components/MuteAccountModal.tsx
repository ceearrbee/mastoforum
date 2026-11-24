import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox, Modal, Select, SelectItem } from '@carbon/react';
import styles from './MuteAccountModal.module.css';

export interface MuteOptions {
  /** Seconds to mute for; 0 mutes indefinitely. */
  duration: number;
  /** Also hide notifications from the account. */
  notifications: boolean;
}

const DURATIONS: ReadonlyArray<{ label: string; seconds: number }> = [
  { label: 'Indefinite', seconds: 0 },
  { label: '5 minutes', seconds: 5 * 60 },
  { label: '30 minutes', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '6 hours', seconds: 6 * 60 * 60 },
  { label: '1 day', seconds: 24 * 60 * 60 },
  { label: '3 days', seconds: 3 * 24 * 60 * 60 },
  { label: '7 days', seconds: 7 * 24 * 60 * 60 },
];

interface Props {
  open: boolean;
  /** Handle shown in the title, without the leading `@`. */
  acct: string;
  onConfirm: (options: MuteOptions) => void;
  onClose: () => void;
}

/** Carbon dialog that asks how long to mute an account and whether to hide its notifications. */
export default function MuteAccountModal({ open, acct, onConfirm, onClose }: Props) {
  const id = useId();
  const [duration, setDuration] = useState('0');
  const [notifications, setNotifications] = useState(true);

  // Reset on every exit so a reopened dialog starts from the defaults.
  const reset = () => {
    setDuration('0');
    setNotifications(true);
  };
  const close = () => {
    reset();
    onClose();
  };

  // Portal to <body>: Carbon's modal renders inline, and ancestors such as the
  // thread list clip position:fixed content (overflow / container-type).
  return createPortal(
    <Modal
      open={open}
      size="sm"
      modalHeading={`Mute @${acct}`}
      primaryButtonText="Mute"
      secondaryButtonText="Cancel"
      onRequestSubmit={() => {
        onConfirm({ duration: Number(duration), notifications });
        close();
      }}
      onRequestClose={close}
    >
      <div className={styles.fields}>
        <Select
          id={`${id}-duration`}
          labelText="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          {DURATIONS.map((d) => (
            <SelectItem key={d.seconds} value={String(d.seconds)} text={d.label} />
          ))}
        </Select>
        <Checkbox
          id={`${id}-notifications`}
          labelText="Hide notifications from this account"
          checked={notifications}
          onChange={(_, { checked }) => setNotifications(checked)}
        />
      </div>
    </Modal>,
    document.body,
  );
}
