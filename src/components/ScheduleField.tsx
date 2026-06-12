import styles from './ScheduleField.module.css';

interface Props {
  /** A `datetime-local` value (empty = post now). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

/** Shared "schedule for later" field; Mastodon requires the time to be ≥5 minutes out. */
export default function ScheduleField({
  value,
  onChange,
  disabled,
  label = 'Schedule for later (optional)',
}: Props) {
  return (
    <label className={styles.scheduleLabel}>
      <span>{label}</span>
      <input
        type="datetime-local"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={styles.scheduleInput}
      />
    </label>
  );
}
