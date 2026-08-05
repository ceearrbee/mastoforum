// The pills are a segmented control: a role="group" of buttons.
import { SORTS, type SortKey } from '../utils/sortPosts';
import styles from './SortPills.module.css';

interface PillGroupProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}

/** Generic segmented pill group — used for both sort and feed-source choices. */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: PillGroupProps<T>) {
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
    <div className={styles.sortPills} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={styles.sortPill}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SortPillsProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
  label?: string;
}

export default function SortPills({ value, onChange, label = 'Sort topics' }: SortPillsProps) {
  return <PillGroup options={SORTS} value={value} onChange={onChange} label={label} />;
}
