import type { ReactNode } from 'react';
import { Modal } from '@carbon/react';

interface Props {
  open: boolean;
  /** Modal title. */
  heading: string;
  /** Explanatory body text. */
  children: ReactNode;
  /** Confirm-button label, e.g. "Delete". */
  primaryText: string;
  /** Style the confirm action as destructive. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A small Carbon-styled confirmation dialog, replacing native `window.confirm`
 * for destructive actions so they match the app's look and feel.
 */
export default function ConfirmModal({
  open,
  heading,
  children,
  primaryText,
  danger,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      open={open}
      danger={danger}
      size="sm"
      modalHeading={heading}
      primaryButtonText={primaryText}
      secondaryButtonText="Cancel"
      onRequestSubmit={() => {
        onConfirm();
        onClose();
      }}
      onRequestClose={onClose}
    >
      <p>{children}</p>
    </Modal>
  );
}
