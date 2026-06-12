import { Modal } from '@carbon/react';
import styles from './ShortcutsHelpModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'j', description: 'Next post' },
  { keys: 'k', description: 'Previous post' },
  { keys: 'r', description: 'Reply to the topic' },
  { keys: '/', description: 'Focus the search box' },
  { keys: '?', description: 'Show this help' },
];

/** Keyboard-shortcuts help as a focus-trapping Carbon Modal (replaces the old `window.alert`). */
export default function ShortcutsHelpModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Keyboard shortcuts"
      primaryButtonText="Close"
      onRequestSubmit={onClose}
    >
      <dl className={styles.list}>
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className={styles.row}>
            <dt className={styles.key}>
              <kbd>{s.keys}</kbd>
            </dt>
            <dd className={styles.desc}>{s.description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
